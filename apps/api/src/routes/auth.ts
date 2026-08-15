import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { googleAuthEnabled, passport } from "../auth/passport.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { sendVerificationEmail } from "../lib/email.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const strongPassword = z.string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.");

authRouter.post("/signup", asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(60),
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: strongPassword,
    confirmPassword: z.string(),
  }).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] }).parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "An account with that email already exists.");
  const token = crypto.randomBytes(32).toString("hex");
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 12),
      emailVerificationToken: token,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, email: true, name: true, role: true },
  });
  const verificationUrl = `/login?verify=${token}`;
  await sendVerificationEmail({ userEmail: user.email, verificationUrl: `${env.WEB_ORIGIN}${verificationUrl}` });
  res.status(201).json({ user, verificationUrl, sentTo: user.email });
}));

authRouter.post("/verify-email", asyncRoute(async (req, res) => {
  const { token } = z.object({ token: z.string().trim().min(20).max(200) }).parse(req.body);
  const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });
  if (!user) throw new HttpError(404, "Verification link is invalid.");
  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) throw new HttpError(410, "Verification link has expired.");
  const safeUser = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationExpiresAt: null },
    select: { id: true, email: true, name: true, role: true },
  });
  await new Promise<void>((resolve, reject) => req.login(safeUser, (error) => error ? reject(error) : resolve()));
  res.json({ user: safeUser });
}));

authRouter.post("/login", asyncRoute(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (!user.emailVerifiedAt) throw new HttpError(403, "Please verify your email before logging in.");
  const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  await new Promise<void>((resolve, reject) => req.login(safeUser, (error) => error ? reject(error) : resolve()));
  res.json({ user: safeUser });
}));

authRouter.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => res.status(204).end());
  });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null, googleAuthEnabled });
});

authRouter.get("/google", (req, res, next) => {
  if (!googleAuthEnabled) return next(new HttpError(503, "Google login is not configured."));
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.WEB_ORIGIN}/login?error=google` }),
  (_req, res) => res.redirect(`${env.WEB_ORIGIN}/`),
);
