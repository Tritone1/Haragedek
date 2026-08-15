import webpush from "web-push";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { milesBetween } from "./distance.js";

const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (enabled) webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

export async function notifyRestaurantFollowers(restaurantId: string, title: string, dealId: string) {
  if (!enabled) return;
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { lat: true, lng: true, name: true } });
  if (!restaurant) return;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { OR: [
      { follows: { some: { restaurantId } } },
      { homeLat: { not: null }, homeLng: { not: null } },
    ] } },
    include: { user: { select: { homeLat: true, homeLng: true, follows: { where: { restaurantId }, select: { restaurantId: true } } } } },
  });
  const nearby = subscriptions.filter(({ user }) => user.follows.length > 0 || (
    user.homeLat != null && user.homeLng != null && milesBetween(user.homeLat, user.homeLng, restaurant.lat, restaurant.lng) <= 10
  ));
  const payload = JSON.stringify({ title: `Fresh deal at ${restaurant.name}`, body: title, url: `/deals/${dealId}` });
  await Promise.allSettled(nearby.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      }
    }
  }));
}

export async function sendSavedDealExpiryNotifications() {
  if (!enabled) return;
  const now = new Date();
  const savedDeals = await prisma.savedDeal.findMany({
    where: {
      deal: { isActive: true, endsAt: { gt: now, lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) } },
      user: { subscriptions: { some: {} } },
    },
    include: { deal: { include: { restaurant: { select: { name: true } } } }, user: { include: { subscriptions: true } } },
  });
  for (const saved of savedDeals) {
    const alreadySent = await prisma.notificationLog.findUnique({
      where: { userId_dealId_kind: { userId: saved.userId, dealId: saved.dealId, kind: "SAVED_DEAL_EXPIRING" } },
    });
    if (alreadySent) continue;
    const payload = JSON.stringify({ title: "Saved deal ending soon", body: `${saved.deal.title} at ${saved.deal.restaurant.name}`, url: `/deals/${saved.dealId}` });
    await Promise.allSettled(saved.user.subscriptions.map((subscription) => webpush.sendNotification({
      endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, payload)));
    await prisma.notificationLog.create({ data: { userId: saved.userId, dealId: saved.dealId, kind: "SAVED_DEAL_EXPIRING" } }).catch(() => undefined);
  }
}
