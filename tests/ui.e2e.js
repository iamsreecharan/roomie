import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000");
await page.getByRole("button", { name: "Personal room" }).waitFor();
await page.screenshot({ path: "/tmp/roomverse-welcome.png", fullPage: true });
await page.getByRole("button", { name: "Personal room" }).click();
await page.getByRole("heading", { name: "My room." }).waitFor();
await page.screenshot({ path: "/tmp/roomverse-room.png", fullPage: true });
for (const [label, heading] of [
  ["The neighborhood", null],
  ["Find your people", null],
  ["Visits & hangouts", null],
  ["Creator Halls", null],
  ["My private corner", null],
  ["Avatar studio", null],
  ["Creator studio", null],
  ["Settings & privacy", null],
]) {
  await page
    .locator(".sidebar")
    .getByRole("button", { name: label, exact: false })
    .first()
    .click();
  await page.waitForTimeout(150);
  assert.ok(
    (await page.locator("h1").allTextContents()).length,
    `${label} must render a heading`,
  );
  assert.equal(await page.locator(".vite-error-overlay").count(), 0);
  console.log(label, await page.locator("h1").allTextContents());
}
await page
  .locator(".sidebar")
  .getByRole("button", { name: "Creator Halls", exact: true })
  .click();
await page.screenshot({ path: "/tmp/roomverse-halls.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page
  .locator(".mobile-tabs")
  .getByRole("button", { name: "Room", exact: true })
  .click();
await page.screenshot({ path: "/tmp/roomverse-mobile.png", fullPage: true });
const width = await page.evaluate(() => ({
  width: innerWidth,
  scroll: document.documentElement.scrollWidth,
}));
assert.ok(
  width.scroll <= width.width + 1,
  `Mobile horizontal overflow ${JSON.stringify(width)}`,
);
assert.equal(errors.length, 0, JSON.stringify(errors));
console.log(
  "Original design navigation and 390px mobile layout passed. Screenshots in /tmp.",
);
await browser.close();
