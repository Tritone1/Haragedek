import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    passport?: { user: string };
  }
}

export {};
