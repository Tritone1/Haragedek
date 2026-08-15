import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { requireAuth, requireMerchant } from "../middleware/auth.js";

export const merchantRouter = Router();

merchantRouter.post("/enroll", requireAuth, asyncRoute(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id }, data: { role: "MERCHANT" },
    select: { id: true, email: true, name: true, role: true },
  });
  req.user = user;
  res.json({ user });
}));

merchantRouter.use(requireMerchant);

const dealInput = z.object({
  restaurantId: z.string().min(1),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  menuItem: z.string().trim().min(2).max(120).nullable().optional(),
  offerType: z.enum(["discount", "combo", "set_menu", "perk", "event", "bundle", "other"]).default("discount"),
  discountPct: z.number().int().min(1).max(100).nullable().optional(),
  tag: z.enum(["breakfast", "lunch", "dinner", "happy hour", "all day"]),
  dietaryTags: z.array(z.string().max(30)).max(10).default([]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().max(200).nullable().optional(),
})
  .refine((value) => value.endsAt > value.startsAt, { message: "End time must be after start time", path: ["endsAt"] })
  .refine((value) => value.offerType !== "discount" || value.discountPct != null, { message: "Discount-type offers need a percentage", path: ["discountPct"] });

async function assertOwner(userId: string, restaurantId: string) {
  const restaurant = await prisma.restaurant.findFirst({ where: { id: restaurantId, ownerUserId: userId, claimStatus: "verified" } });
  if (!restaurant) throw new HttpError(403, "You do not manage this restaurant.");
  return restaurant;
}

merchantRouter.get("/dashboard", asyncRoute(async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerUserId: req.user!.id },
    include: {
      deals: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { views: true, savedBy: true, redemptions: true } } },
      },
      _count: { select: { followers: true } },
    },
  });
  res.json({ restaurants });
}));

merchantRouter.post("/deals", asyncRoute(async (req, res) => {
  const input = dealInput.parse(req.body);
  const restaurant = await assertOwner(req.user!.id, input.restaurantId);
  const pendingCount = await prisma.deal.count({ where: { restaurantId: input.restaurantId, status: "pending_review" } });
  if (pendingCount >= 5) throw new HttpError(429, "This venue already has 5 pending submissions.");
  const now = new Date();
  const autoApprove = restaurant.autoApproveOffers;
  const deal = await prisma.deal.create({
    data: {
      ...input,
      status: autoApprove ? "approved" : "pending_review",
      isActive: autoApprove,
      submittedByUserId: req.user!.id,
      submittedAt: now,
      reviewedAt: autoApprove ? now : null,
      reviewNotes: autoApprove ? "Auto-approved for trusted venue." : null,
    },
  });
  res.status(201).json({ deal });
}));

merchantRouter.patch("/deals/:id", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) throw new HttpError(404, "Offer not found.");
  const existingRestaurant = await assertOwner(req.user!.id, existing.restaurantId);
  const input = dealInput.partial().parse(req.body);
  const restaurant = input.restaurantId && input.restaurantId !== existing.restaurantId ? await assertOwner(req.user!.id, input.restaurantId) : existingRestaurant;
  const pendingCount = await prisma.deal.count({ where: { restaurantId: input.restaurantId ?? existing.restaurantId, status: "pending_review", id: { not: existing.id } } });
  if (pendingCount >= 5) throw new HttpError(429, "This venue already has 5 pending submissions.");
  const now = new Date();
  const autoApprove = restaurant.autoApproveOffers;
  const deal = await prisma.deal.update({
    where: { id: existing.id },
    data: {
      ...input,
      status: autoApprove ? "approved" : "pending_review",
      isActive: autoApprove,
      submittedByUserId: req.user!.id,
      submittedAt: now,
      reviewedByUserId: null,
      reviewedAt: autoApprove ? now : null,
      reviewNotes: autoApprove ? "Auto-approved for trusted venue." : null,
    },
  });
  res.json({ deal });
}));

merchantRouter.post("/deals/:id/expire", asyncRoute(async (req, res) => {
  const dealId = z.string().parse(req.params.id);
  const existing = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!existing) throw new HttpError(404, "Offer not found.");
  await assertOwner(req.user!.id, existing.restaurantId);
  const deal = await prisma.deal.update({ where: { id: existing.id }, data: { isActive: false, status: "expired" } });
  res.json({ deal });
}));

merchantRouter.post("/redemptions/redeem", asyncRoute(async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(4).max(30) }).parse(req.body);
  const redemption = await prisma.redemption.findUnique({
    where: { redemptionCode: code.toUpperCase() },
    include: { deal: { include: { restaurant: { select: { id: true, name: true } } } }, user: { select: { id: true, name: true, email: true } } },
  });
  if (!redemption) throw new HttpError(404, "Redemption code not found.");
  await assertOwner(req.user!.id, redemption.deal.restaurantId);
  if (redemption.redeemedAt) throw new HttpError(409, "This code has already been redeemed.");
  const updated = await prisma.redemption.update({
    where: { id: redemption.id }, data: { redeemedAt: new Date() },
  });
  res.json({ redemption: { ...updated, deal: redemption.deal, user: redemption.user } });
}));
