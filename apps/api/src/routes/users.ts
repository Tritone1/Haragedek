import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.patch("/me/location", asyncRoute(async (req, res) => {
  const input = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id }, data: { homeLat: input.lat, homeLng: input.lng },
    select: { id: true, email: true, name: true, role: true, homeLat: true, homeLng: true },
  });
  res.json({ user });
}));

const preferencesSchema = z.object({
  radius: z.number().min(1).max(100),
  cuisine: z.string().max(60),
  minDiscount: z.number().min(0).max(100),
  dietary: z.string().max(30),
  endingSoon: z.boolean(),
  sort: z.enum(["distance", "discount", "ending", "rating"]),
});

usersRouter.get("/me/preferences", asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { preferencesJson: true } });
  res.json({ preferences: user?.preferencesJson ?? null });
}));

usersRouter.put("/me/preferences", asyncRoute(async (req, res) => {
  const preferences = preferencesSchema.parse(req.body);
  await prisma.user.update({ where: { id: req.user!.id }, data: { preferencesJson: preferences } });
  res.json({ preferences });
}));

usersRouter.get("/me/saved", asyncRoute(async (req, res) => {
  const rows = await prisma.savedDeal.findMany({
    where: { userId: req.user!.id },
    orderBy: { savedAt: "desc" },
    include: { deal: { include: { restaurant: true, ratings: { select: { value: true } } } } },
  });
  res.json({ deals: rows.map(({ deal, savedAt }) => ({
    ...deal,
    savedAt,
    dealRating: deal.ratings.length
      ? deal.ratings.reduce((sum, rating) => sum + rating.value, 0) / deal.ratings.length : null,
    ratings: undefined,
  })) });
}));

usersRouter.get("/me/redemptions", asyncRoute(async (req, res) => {
  const redemptions = await prisma.redemption.findMany({
    where: { userId: req.user!.id }, orderBy: { claimedAt: "desc" },
    include: { deal: { include: { restaurant: true } } },
  });
  res.json({ redemptions });
}));
