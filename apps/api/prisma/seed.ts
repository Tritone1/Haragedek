import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const prisma = new PrismaClient();

const restaurants = [
  ["Chinar Restaurant", "Azerbaijani", "Neftchilar Ave, Baku", 40.4093, 49.8671, 4.8, ["halal"]],
  ["Sky Bar Baku", "Rooftop Bar", "JW Marriott, Baku Boulevard", 40.4112, 49.8702, 4.6, []],
  ["Old City Pub", "Pub", "Icherisheher, Baku", 40.3660, 49.8353, 4.5, []],
  ["Flame Lounge", "Lounge", "Flame Towers, Baku", 40.3609, 49.8373, 4.9, ["halal"]],
  ["Caspian Bistro", "Mediterranean", "Rasul Rza St, Baku", 40.4050, 49.8600, 4.7, ["vegetarian"]],
  ["Nargiz Cocktail Bar", "Cocktail Bar", "Nizami St 48, Baku", 40.4070, 49.8700, 4.4, []],
  ["Dolma House", "Azerbaijani", "M.Rasulzada St, Baku", 40.3684, 49.8358, 4.7, ["halal", "vegetarian"]],
  ["Sahil Kitchen", "Seafood", "Baku Boulevard, Baku", 40.3715, 49.8485, 4.6, ["gluten-free"]],
  ["Fountain Square Grill", "Grill", "Fountain Square, Baku", 40.3719, 49.8376, 4.5, ["halal"]],
  ["Nizami Sushi", "Japanese", "Nizami St, Baku", 40.3764, 49.8432, 4.6, []],
  ["Qala Taproom", "Pub", "Aziz Aliyev St, Baku", 40.3688, 49.8370, 4.4, []],
  ["White City Cafe", "Cafe", "Baku White City", 40.3869, 49.8753, 4.6, ["vegetarian"]],
  ["Port Baku Trattoria", "Italian", "Port Baku, Baku", 40.3787, 49.8540, 4.8, ["vegetarian"]],
  ["Nar & Saffron", "Fine Dining", "Khagani St, Baku", 40.3749, 49.8460, 4.9, ["halal"]],
  ["Bulvar Burger", "Burger", "Seaside Boulevard, Baku", 40.3689, 49.8497, 4.3, ["halal"]],
  ["Shah Plov", "Azerbaijani", "Targovi, Baku", 40.3728, 49.8398, 4.7, ["halal"]],
  ["Mangal Steakhouse", "Steakhouse", "Badamdar, Baku", 40.3452, 49.8135, 4.6, ["halal"]],
  ["Crescent Mocktail Club", "Mocktail Bar", "Crescent Bay, Baku", 40.3658, 49.8589, 4.5, ["vegetarian"]],
] as const;

const titles = [
  "Lule kebab dinner deal", "2-for-1 signature cocktails", "Happy hour pints", "VIP table package",
  "Set dinner for two", "Ladies night welcome", "Dolma tasting plate", "Caspian seafood platter",
  "Mixed grill combo", "Sushi roll set", "Pub snack board", "Coffee and dessert duo",
  "Pasta night special", "Chef's tasting menu", "Burger combo", "Shah plov for two",
  "Steak and sides", "Zero-proof cocktail flight",
];

const descriptions = [
  "Lule kebab, fresh herbs, lavash, grilled tomato, and ayran for dine-in guests.",
  "Buy one signature cocktail and get the second on the house from 6 PM to 10 PM.",
  "Draft beers and pub bites for a friendlier after-work price.",
  "Reserve a VIP table package and save on the full bottle-and-snacks setup.",
  "Three-course dinner for two with salad, mains, dessert, and tea.",
  "Free entry plus one welcome drink for ladies before midnight.",
  "A shared Azerbaijani dolma plate with yogurt, herbs, and house bread.",
  "Grilled fish, calamari, salad, and lemon potatoes for two people.",
  "Chicken, lamb, lula kebab, fries, salad, and two soft drinks.",
  "Choose any two classic rolls plus miso soup and green tea.",
  "Wings, fries, onion rings, and sauces made for a table of friends.",
  "Any cake slice with cappuccino, latte, or Azerbaijani tea.",
  "House pasta, seasonal sauce, and a glass of wine or sparkling water.",
  "A small tasting menu built around nar, saffron, local greens, and grilled meats.",
  "Burger, fries, and a drink combo for late-night boulevard walks.",
  "Shared shah plov with pickles, salad, and tea for two guests.",
  "Ribeye or tenderloin with two sides and house sauce.",
  "Three zero-proof cocktails with a snack plate for the table.",
];

const discounts = [25, 50, 30, 50, 35, 25, 30, 20, 40, 25, 30, 35, 40, 45, 25, 30, 35, 25];
const tags = ["dinner", "happy hour", "happy hour", "dinner", "dinner", "happy hour", "all day", "dinner", "lunch", "dinner", "happy hour", "all day", "dinner", "dinner", "lunch", "dinner", "dinner", "happy hour"];
const photos = [
  "photo-1552566626-52f8b828add9", "photo-1555396273-367ea4eb4db5", "photo-1514933651103-005eec06c04b",
  "photo-1544148103-0773bf10d330", "photo-1517248135467-4c7edcad34c4", "photo-1551218808-94e220e084d2",
];

async function main() {
  const existingVenueCount = await prisma.restaurant.count();
  if (existingVenueCount > 0) {
    console.log(`Seed skipped: production already has ${existingVenueCount} venues.`);
    return;
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@bakunights.test" },
    update: { role: "ADMIN", passwordHash: await bcrypt.hash("admin1234", 12), emailVerifiedAt: new Date() },
    create: { email: "admin@bakunights.test", name: "BakuNights Admin", role: "ADMIN", passwordHash: await bcrypt.hash("admin1234", 12), emailVerifiedAt: new Date() },
  });
  await prisma.user.upsert({
    where: { email: "ops@bakunights.test" },
    update: { role: "ADMIN", passwordHash: await bcrypt.hash("admin1234", 12), emailVerifiedAt: new Date() },
    create: { email: "ops@bakunights.test", name: "BakuNights Ops", role: "ADMIN", passwordHash: await bcrypt.hash("admin1234", 12), emailVerifiedAt: new Date() },
  });
  const merchant = await prisma.user.upsert({
    where: { email: "merchant@grubstub.test" },
    update: { role: "MERCHANT", passwordHash: await bcrypt.hash("merchant123", 12), emailVerifiedAt: new Date() },
    create: { email: "merchant@grubstub.test", name: "Demo Merchant", role: "MERCHANT", passwordHash: await bcrypt.hash("merchant123", 12), emailVerifiedAt: new Date() },
  });
  await prisma.user.upsert({
    where: { email: "demo@bakunights.test" },
    update: { emailVerifiedAt: new Date() },
    create: { email: "demo@bakunights.test", name: "Deal Hunter", passwordHash: await bcrypt.hash("Password123", 12), emailVerifiedAt: new Date(), homeLat: 40.4093, homeLng: 49.8671 },
  });

  const now = Date.now();
  for (let index = 0; index < restaurants.length; index += 1) {
    const [name, cuisine, address, lat, lng, rating, dietaryTags] = restaurants[index]!;
    const restaurant = await prisma.restaurant.create({ data: {
      name, cuisine, address, lat, lng, rating,
      dietaryTags: [...dietaryTags], phone: `+994 50 555 ${String(1000 + index).slice(-4)}`,
      hoursJson: { Monday: "12:00-00:00", Tuesday: "12:00-00:00", Wednesday: "12:00-00:00", Thursday: "12:00-01:00", Friday: "12:00-02:00", Saturday: "12:00-02:00", Sunday: "12:00-00:00" },
      photoUrl: `https://images.unsplash.com/${photos[index % photos.length]}?auto=format&fit=crop&w=1200&q=80`,
      ownerUserId: index < 3 ? merchant.id : null,
      claimStatus: index < 3 ? "verified" : "unclaimed",
      autoApproveOffers: index < 3,
    } });
    await prisma.deal.create({ data: {
      restaurantId: restaurant.id,
      title: titles[index]!, description: descriptions[index]!, discountPct: discounts[index]!, tag: tags[index]!,
      dietaryTags: [...dietaryTags], startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now + ((index % 5) + 2) * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000),
      offerType: index % 4 === 0 ? "combo" : "discount",
      menuItem: index % 3 === 0 ? titles[index]!.replace(" deal", "") : null,
      status: index < 3 ? "pending_review" : "approved",
      isActive: index >= 3,
      submittedByUserId: index < 3 ? merchant.id : admin.id,
      submittedAt: new Date(now - 60 * 60 * 1000),
      reviewedByUserId: index < 3 ? null : admin.id,
      reviewedAt: index < 3 ? null : new Date(now - 30 * 60 * 1000),
    } });
  }
  const unclaimedVenue = await prisma.restaurant.findFirst({ where: { ownerUserId: null } });
  if (unclaimedVenue) {
    await prisma.venueClaimRequest.create({
      data: {
        venueId: unclaimedVenue.id,
        requestingUserId: merchant.id,
        contactPhone: "+994 50 555 0101",
        contactEmail: "manager@example.test",
        proofNotes: "I manage this venue and can verify with business registration documents.",
      },
    });
    await prisma.restaurant.update({ where: { id: unclaimedVenue.id }, data: { claimStatus: "pending_verification" } });
  }
  console.log(`Seeded ${restaurants.length} Baku venues, approved offers, pending merchant offers, admins, and one claim request.`);
}

main().finally(() => prisma.$disconnect());
