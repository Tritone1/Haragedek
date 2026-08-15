import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const pushRouter = Router();
pushRouter.use(requireAuth);

pushRouter.post("/subscribe", asyncRoute(async (req, res) => {
  const input = z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }).parse(req.body);
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { userId: req.user!.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
    create: { userId: req.user!.id, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth },
  });
  res.status(201).json({ subscription });
}));

pushRouter.delete("/subscribe", asyncRoute(async (req, res) => {
  const input = z.object({ endpoint: z.string().url() }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint, userId: req.user!.id } });
  res.status(204).end();
}));
