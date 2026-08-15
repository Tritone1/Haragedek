import dotenv from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedBakuStarterData } from "../src/lib/seedBaku.js";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

if (process.env.SEED_DATABASE_URL) process.env.DATABASE_URL = process.env.SEED_DATABASE_URL;

const prisma = new PrismaClient();

seedBakuStarterData(prisma)
  .then((result) => {
    console.log(result.seeded
      ? `Seeded ${result.venueCount} Baku venues and starter offers.`
      : `Seed skipped: production already has ${result.venueCount} venues.`);
  })
  .finally(() => prisma.$disconnect());
