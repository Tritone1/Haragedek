export type User = {
  id: string;
  email: string;
  name: string;
  role: "CONSUMER" | "MERCHANT" | "ADMIN";
  avatar?: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  rating?: number;
  lat: number;
  lng: number;
  photoUrl?: string;
  phone?: string;
  hoursJson?: string;
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  menuItem?: string | null;
  offerType?: "discount" | "combo" | "set_menu" | "perk" | "event" | "bundle" | "other";
  discountPct?: number | null;
  tag?: string;
  dietaryTags?: string[];
  endsAt: string;
  dealRating?: number;
  distanceMiles?: number | null;
  status?: "draft" | "pending_review" | "approved" | "rejected" | "expired";
  restaurant: Restaurant;
};

export type Redemption = {
  redemptionCode: string;
  qrDataUrl?: string;
};
