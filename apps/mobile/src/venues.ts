export type Venue = {
  id: number;
  name: string;
  category: "Restaurant" | "Bar" | "Pub" | "Lounge";
  rating: number;
  address: string;
  deal: string;
  hours: string;
  distance: string;
  latitude: number;
  longitude: number;
  image: string;
};

export const BAKU_CENTER = {
  latitude: 40.3977,
  longitude: 49.8671,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

export const VENUES: Venue[] = [
  {
    id: 1,
    name: "Chinar Restaurant",
    category: "Restaurant",
    rating: 4.8,
    address: "Neftchilar Avenue, Baku",
    deal: "20% off the entire menu tonight",
    hours: "Open until 01:00",
    distance: "0.4 km",
    latitude: 40.4093,
    longitude: 49.8671,
    image: "https://images.unsplash.com/photo-1709548145082-04d0cde481d4?w=900&h=600&fit=crop",
  },
  {
    id: 2,
    name: "Sky Bar Baku",
    category: "Bar",
    rating: 4.6,
    address: "JW Marriott, Baku Boulevard",
    deal: "Two-for-one signature cocktails",
    hours: "Open until 02:00",
    distance: "0.8 km",
    latitude: 40.4112,
    longitude: 49.8702,
    image: "https://images.unsplash.com/photo-1597075687490-8f673c6c17f6?w=900&h=600&fit=crop",
  },
  {
    id: 3,
    name: "Old City Pub",
    category: "Pub",
    rating: 4.5,
    address: "Icherisheher, Old City",
    deal: "Happy hour pints — 30% off",
    hours: "Open until 00:00",
    distance: "1.2 km",
    latitude: 40.366,
    longitude: 49.8353,
    image: "https://images.unsplash.com/photo-1578911489158-334e5cd2a051?w=900&h=600&fit=crop",
  },
  {
    id: 4,
    name: "Flame Lounge",
    category: "Lounge",
    rating: 4.9,
    address: "Flame Towers, Baku",
    deal: "VIP table package — save ₼80",
    hours: "Open until 03:00",
    distance: "1.5 km",
    latitude: 40.3609,
    longitude: 49.8373,
    image: "https://images.unsplash.com/photo-1615887584283-91f1be7fdc34?w=900&h=600&fit=crop",
  },
  {
    id: 5,
    name: "Caspian Bistro",
    category: "Restaurant",
    rating: 4.7,
    address: "Rasul Rza Street, Baku",
    deal: "Set dinner for two — 30% off",
    hours: "Open until 23:00",
    distance: "0.6 km",
    latitude: 40.405,
    longitude: 49.86,
    image: "https://images.unsplash.com/photo-1674857977971-131936c7b5ea?w=900&h=600&fit=crop",
  },
];
