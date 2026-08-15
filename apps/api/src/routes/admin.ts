import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const venueInput = z.object({
  name: z.string().trim().min(2).max(120),
  cuisine: z.string().trim().min(2).max(60),
  dietaryTags: z.array(z.string().trim().max(30)).max(10).default([]),
  address: z.string().trim().min(4).max(240),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().trim().max(40).nullable().optional(),
  photoUrl: z.string().trim().url().nullable().optional(),
  rating: z.number().min(0).max(5).default(0),
  isActive: z.boolean().default(true),
  autoApproveOffers: z.boolean().default(false),
  verificationNotes: z.string().trim().max(2000).nullable().optional(),
});

const dealInput = z.object({
  restaurantId: z.string().min(1),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  menuItem: z.string().trim().min(2).max(120).nullable().optional(),
  offerType: z.enum(["discount", "combo", "set_menu", "perk", "event", "bundle", "other"]).default("discount"),
  discountPct: z.number().int().min(1).max(100).nullable().optional(),
  tag: z.enum(["breakfast", "lunch", "dinner", "happy hour", "all day"]),
  dietaryTags: z.array(z.string().trim().max(30)).max(10).default([]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().trim().max(200).nullable().optional(),
})
  .refine((value) => value.endsAt > value.startsAt, { message: "End time must be after start time", path: ["endsAt"] })
  .refine((value) => value.offerType !== "discount" || value.discountPct != null, { message: "Discount-type offers need a percentage", path: ["discountPct"] });

async function audit(actorUserId: string, action: string, targetType: string, targetId: string, notes?: string | null) {
  await prisma.auditLog.create({ data: { actorUserId, action, targetType, targetId, notes } });
}

adminRouter.get("/dashboard", asyncRoute(async (_req, res) => {
  const now = new Date();
  const [activeVenues, dealsLiveToday, dealsPendingReview] = await Promise.all([
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.deal.count({ where: { isActive: true, status: "approved", startsAt: { lte: now }, endsAt: { gt: now } } }),
    prisma.deal.count({ where: { status: "pending_review" } }),
  ]);
  res.json({ metrics: { activeVenues, dealsLiveToday, dealsPendingReview } });
}));

adminRouter.get("/venues", asyncRoute(async (_req, res) => {
  const venues = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
    include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { deals: true } } },
  });
  res.json({ venues });
}));

adminRouter.post("/venues", asyncRoute(async (req, res) => {
  const input = venueInput.parse(req.body);
  const venue = await prisma.restaurant.create({ data: { ...input, claimStatus: "unclaimed" } });
  await audit(req.user!.id, "venue_created", "venue", venue.id, "Admin-created venue");
  res.status(201).json({ venue });
}));

adminRouter.patch("/venues/:id", asyncRoute(async (req, res) => {
  const venueId = z.string().parse(req.params.id);
  const input = venueInput.partial().parse(req.body);
  const venue = await prisma.restaurant.update({ where: { id: venueId }, data: input });
  await audit(req.user!.id, input.isActive === false ? "venue_deactivated" : "venue_updated", "venue", venue.id, input.verificationNotes);
  res.json({ venue });
}));

adminRouter.get("/deals", asyncRoute(async (_req, res) => {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  });
  res.json({ deals });
}));

adminRouter.post("/deals", asyncRoute(async (req, res) => {
  const input = dealInput.parse(req.body);
  const now = new Date();
  const deal = await prisma.deal.create({
    data: {
      ...input,
      status: "approved",
      isActive: true,
      submittedByUserId: req.user!.id,
      reviewedByUserId: req.user!.id,
      submittedAt: now,
      reviewedAt: now,
    },
  });
  await audit(req.user!.id, "deal_auto_approved", "deal", deal.id, "Admin-created deal");
  res.status(201).json({ deal });
}));

adminRouter.patch("/deals/:id", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const input = dealInput.partial().parse(req.body);
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { ...input, status: "approved", isActive: true, reviewedByUserId: req.user!.id, reviewedAt: new Date(), reviewNotes: null },
  });
  await audit(req.user!.id, "deal_auto_approved", "deal", deal.id, "Admin saved deal");
  res.json({ deal });
}));

adminRouter.post("/deals/:id/approve", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { status: "approved", isActive: true, reviewedByUserId: req.user!.id, reviewedAt: new Date(), reviewNotes: null },
  });
  if (deal.submittedByUserId) {
    await prisma.notificationLog.upsert({
      where: { userId_dealId_kind: { userId: deal.submittedByUserId, dealId: deal.id, kind: "deal_approved" } },
      create: { userId: deal.submittedByUserId, dealId: deal.id, kind: "deal_approved" },
      update: { sentAt: new Date() },
    });
  }
  await audit(req.user!.id, "deal_approved", "deal", deal.id, "Approved from moderation queue");
  res.json({ deal });
}));

adminRouter.post("/deals/:id/reject", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const { notes } = z.object({ notes: z.string().trim().min(3).max(2000) }).parse(req.body);
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { status: "rejected", isActive: false, reviewedByUserId: req.user!.id, reviewedAt: new Date(), reviewNotes: notes },
  });
  if (deal.submittedByUserId) {
    await prisma.notificationLog.upsert({
      where: { userId_dealId_kind: { userId: deal.submittedByUserId, dealId: deal.id, kind: "deal_rejected" } },
      create: { userId: deal.submittedByUserId, dealId: deal.id, kind: "deal_rejected" },
      update: { sentAt: new Date() },
    });
  }
  await audit(req.user!.id, "deal_rejected", "deal", deal.id, notes);
  res.json({ deal });
}));

adminRouter.post("/deals/:id/expire", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const deal = await prisma.deal.update({ where: { id: dealId }, data: { status: "expired", isActive: false } });
  await audit(req.user!.id, "deal_expired", "deal", deal.id, "Expired by admin");
  res.json({ deal });
}));

adminRouter.get("/claim-requests", asyncRoute(async (_req, res) => {
  const claims = await prisma.venueClaimRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: {
      venue: { select: { id: true, name: true, address: true, ownerUserId: true } },
      requestingUser: { select: { id: true, name: true, email: true } },
    },
  });
  res.json({ claims });
}));

adminRouter.post("/claim-requests/:id/approve", asyncRoute(async (req, res) => {
  const claimId = z.string().parse(req.params.id);
  const claim = await prisma.venueClaimRequest.findUnique({ where: { id: claimId } });
  if (!claim) throw new HttpError(404, "Claim request not found.");
  const [updated] = await prisma.$transaction([
    prisma.venueClaimRequest.update({ where: { id: claim.id }, data: { status: "approved", reviewedAt: new Date() } }),
    prisma.restaurant.update({ where: { id: claim.venueId }, data: { ownerUserId: claim.requestingUserId, claimStatus: "verified", verificationNotes: claim.proofNotes } }),
    prisma.user.update({ where: { id: claim.requestingUserId }, data: { role: "MERCHANT" } }),
    prisma.auditLog.create({ data: { actorUserId: req.user!.id, action: "venue_verified", targetType: "venue", targetId: claim.venueId, notes: claim.proofNotes } }),
  ]);
  res.json({ claim: updated });
}));

adminRouter.post("/claim-requests/:id/reject", asyncRoute(async (req, res) => {
  const claimId = z.string().parse(req.params.id);
  const { notes } = z.object({ notes: z.string().trim().min(3).max(2000) }).parse(req.body);
  const claim = await prisma.venueClaimRequest.update({ where: { id: claimId }, data: { status: "rejected", reviewedAt: new Date() } });
  await audit(req.user!.id, "venue_claim_rejected", "venue_claim_request", claim.id, notes);
  res.json({ claim });
}));
