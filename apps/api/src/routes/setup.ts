import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { seedBakuStarterData } from "../lib/seedBaku.js";

export const setupRouter = Router();

setupRouter.post("/seed-baku", asyncRoute(async (req, res) => {
  if (!env.SETUP_SEED_TOKEN) throw new HttpError(404, "Setup seed is not enabled.");
  const { token } = z.object({ token: z.string().min(24) }).parse(req.body);
  if (token !== env.SETUP_SEED_TOKEN) throw new HttpError(403, "Setup token is invalid.");
  const result = await seedBakuStarterData(prisma);
  res.json(result);
}));
