import { chromium, devices, webkit } from "playwright-core";

const executablePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = process.env.GRUB_STUB_URL || "http://127.0.0.1:5173";
const targets = [
  { name: "iPhone 13", screenshot: "ios-check.png", engine: "webkit" },
  { name: "Pixel 7", screenshot: "android-check.png", engine: "chromium" },
];

let failed = false;

for (const target of targets) {
  const browser = target.engine === "webkit"
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ executablePath, headless: true });
  const { defaultBrowserType: _defaultBrowserType, ...device } = devices[target.name];
  const context = await browser.newContext({
    ...device,
    geolocation: { latitude: 40.4017, longitude: 49.8498 },
    permissions: ["geolocation"],
    locale: "en-US",
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /Google Maps JavaScript API error|InvalidKey|RefererNotAllowed|BillingNotEnabled|BakuNights Google Maps/i.test(message.text())) consoleErrors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("[data-venue-card]").first().waitFor({ state: "visible" });

  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    venueCards: document.querySelectorAll("[data-venue-card]").length,
    hasManifest: Boolean(document.querySelector('link[rel="manifest"]')),
    hasCountdown: Array.from(document.querySelectorAll("span")).some((element) => /^\d{2}:\d{2}:\d{2}$/.test(element.textContent || "")),
  }));
  const controlsVisible = await Promise.all([
    page.getByRole("link", { name: "BakuNights home" }).isVisible(),
    page.getByRole("button", { name: "All", exact: true }).isVisible(),
    page.getByRole("button", { name: /Navigate/ }).first().isVisible(),
  ]);
  await page.screenshot({ path: target.screenshot, fullPage: false });

  const mobileSearch = page.locator('input[placeholder^="Search venues"]').last();
  await mobileSearch.fill("Flame");
  await page.locator("[data-venue-card]").filter({ hasText: "Flame Lounge" }).waitFor({ state: "visible" });
  const searchResultCount = await page.locator("[data-venue-card]").count();
  await mobileSearch.fill("");
  await page.getByRole("button", { name: "Lounges", exact: true }).click();
  const categoryResultCount = await page.locator("[data-venue-card]").count();
  await page.getByRole("button", { name: "All", exact: true }).click();
  const firstSave = page.getByRole("button", { name: /^Save / }).first();
  if (await firstSave.count()) await firstSave.click();
  await page.locator("[data-venue-card]").filter({ hasText: "Flame Lounge" }).getByRole("button", { name: "Navigate to Flame Lounge in Haragedek" }).click();
  await page.getByRole("heading", { name: "Navigate without leaving the app" }).scrollIntoViewIfNeeded();
  await page.locator("#map").getByText("Flame Lounge", { exact: true }).last().waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelectorAll(".google-venue-pin").length > 0 || Boolean(document.querySelector('iframe[title^="Map showing"]')), undefined, { timeout: 10000 });
  const googleMapVisible = await page.getByLabel("Google map of Baku venues").isVisible().catch(() => false);
  const osmMapVisible = await page.getByTitle(/Map showing/).isVisible().catch(() => false);
  const googleMarkers = await page.locator(".google-venue-pin").count();
  const liveLocationVisible = await page.locator("#map").getByText("Your location is live", { exact: true }).isVisible();
  const inAppRouteButton = page.locator("#map").getByRole("button", { name: /in-app route to Flame Lounge/ });
  const inAppRouteVisible = await inAppRouteButton.isVisible();
  await inAppRouteButton.waitFor({ state: "visible" });
  await inAppRouteButton.click();
  const routeModeDialogVisible = await page.getByRole("dialog", { name: "How are you travelling?" }).isVisible();
  const routeModesVisible = await Promise.all([
    page.getByRole("button", { name: "Public transport" }).isVisible(),
    page.getByRole("button", { name: "Walking" }).isVisible(),
    page.getByRole("button", { name: "Vehicle" }).isVisible(),
  ]);
  await page.getByRole("button", { name: "Vehicle" }).click();
  await page.waitForFunction(() => {
    const button = document.querySelector('#map button[aria-label*="in-app route to Flame Lounge"]');
    return Boolean(button && !button.disabled);
  });
  await page.locator("#map").getByRole("button", { name: "Other navigation options for Flame Lounge" }).click();
  const navigationOptionsVisible = await page.getByRole("dialog", { name: "Other navigation options" }).isVisible();
  const boltLinkVisible = await page.getByRole("link", { name: /Open Bolt/ }).isVisible();
  const googleMapsLinkVisible = await page.getByRole("dialog").getByRole("link", { name: "Open Google Maps", exact: true }).isVisible();
  await page.getByRole("button", { name: "Close navigation options" }).click();

  const passed = metrics.documentWidth <= metrics.viewportWidth
    && metrics.venueCards === 6
    && metrics.hasManifest
    && metrics.hasCountdown
    && controlsVisible.every(Boolean)
    && searchResultCount === 1
    && categoryResultCount === 1
    && (googleMapVisible || osmMapVisible)
    && (!googleMapVisible || googleMarkers === 6)
    && (consoleErrors.length === 0 || osmMapVisible)
    && liveLocationVisible
    && inAppRouteVisible
    && routeModeDialogVisible
    && routeModesVisible.every(Boolean)
    && navigationOptionsVisible
    && boltLinkVisible
    && googleMapsLinkVisible
    && pageErrors.length === 0;
  failed ||= !passed;
  console.log(JSON.stringify({ device: target.name, passed, ...metrics, controlsVisible, searchResultCount, categoryResultCount, mapProvider: googleMapVisible ? "google" : "openstreetmap", googleMarkers, liveLocationVisible, inAppRouteVisible, routeModeDialogVisible, routeModesVisible, navigationOptionsVisible, boltLinkVisible, googleMapsLinkVisible, consoleErrors, pageErrors }));
  await context.close();
  await browser.close();
}

const desktopBrowser = await chromium.launch({ executablePath, headless: true });
for (const layout of [{ name: "tablet", width: 820, columns: 2 }, { name: "desktop", width: 1440, columns: 3 }]) {
  const page = await desktopBrowser.newPage({ viewport: { width: layout.width, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("[data-venue-card]").first().waitFor({ state: "visible" });
  const firstRowColumns = await page.locator("[data-venue-card]").evaluateAll((cards) => {
    const firstTop = cards[0]?.getBoundingClientRect().top ?? 0;
    return cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2).length;
  });
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const passed = firstRowColumns === layout.columns && documentWidth <= layout.width;
  failed ||= !passed;
  console.log(JSON.stringify({ device: layout.name, passed, viewportWidth: layout.width, documentWidth, firstRowColumns }));
  await page.close();
}
await desktopBrowser.close();

if (failed) process.exit(1);
