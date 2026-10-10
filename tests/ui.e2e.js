import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const accounts = [];
const errors = [];
const tag = randomBytes(4).toString("hex");
const password = `Browser-test-${tag}-42`;
async function account(name, width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 1050 : 844 },
  });
  const handle = `ui_${name.toLowerCase()}_${tag}`;
  const response = await context.request.post(`${base}/api/auth/register`, {
    data: {
      name,
      handle,
      email: `${handle}@example.test`,
      password,
      age: 24,
      consent: true,
    },
  });
  assert.equal(response.status(), 201, await response.text());
  const bootstrap = await (
    await context.request.get(`${base}/api/bootstrap`)
  ).json();
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  const user = { context, page, handle, id: bootstrap.user.id, bootstrap };
  accounts.push(user);
  await page.goto(base);
  await page.getByRole("heading", { name: "My room", exact: true }).waitFor();
  return user;
}
async function action(user, type, payload = {}) {
  const response = await user.context.request.post(`${base}/api/action`, {
    data: { type, ...payload },
  });
  assert.equal(response.status(), 200, `${type}: ${await response.text()}`);
  return response.json();
}
async function route(user, page, id) {
  await user.page.goto(
    `${base}/#/${page}${id ? `/${encodeURIComponent(id)}` : ""}`,
  );
  await user.page.locator("main h1").first().waitFor();
}
async function noOverflow(page) {
  const size = await page.evaluate(() => ({
    screen: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    size.document <= size.screen + 1,
    `Overflow ${JSON.stringify(size)}`,
  );
}
try {
  const host = await account("Host");
  const guest = await account("Guest", 390);
  const third = await account("Third", 390);
  assert.deepEqual(
    host.bootstrap.room.objects.map((object) => object.type),
    ["bed"],
  );
  assert.equal(
    await host.page
      .getByRole("button", { name: /feed|halls|creator studio/i })
      .count(),
    0,
  );
  await host.page.getByLabel("Sign out", { exact: true }).click();
  await host.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await host.page
    .getByLabel("Email", { exact: true })
    .fill(`${host.handle}@example.test`);
  await host.page.getByLabel("Password", { exact: true }).fill(password);
  await host.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await host.page
    .getByRole("heading", { name: "My room", exact: true })
    .waitFor();
  const photoResponse = await host.context.request.post(`${base}/api/upload`, {
    data: {
      dataUrl: `data:image/png;base64,${(await host.page.screenshot({ clip: { x: 0, y: 0, width: 2, height: 2 } })).toString("base64")}`,
      kind: "photo",
      name: "shared.png",
    },
  });
  assert.ok(photoResponse.ok());
  const photo = await photoResponse.json();
  const memories = host.bootstrap.resources.find(
    (resource) => resource.type === "memories",
  );
  await action(host, "resource.save", {
    resourceId: memories.id,
    content: [{ id: "photo", title: "Shared photo", url: photo.url }],
  });
  await host.page.getByLabel("Ask Roomie").fill("Add a plant");
  await host.page
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await host.page
    .getByRole("button", { name: "Apply changes", exact: true })
    .waitFor();
  await host.page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await host.page
    .getByRole("button", { name: "Apply changes", exact: true })
    .waitFor({ state: "hidden" });
  console.log("Starter room + Roomie passed");
  await noOverflow(guest.page);
  await guest.page
    .getByRole("combobox", { name: "Search friends" })
    .fill(host.handle);
  await guest.page
    .locator("#friend-search-results")
    .getByRole("option")
    .first()
    .click();
  await guest.page
    .getByRole("button", { name: "Add friend", exact: true })
    .click();
  const request = guest.page.getByRole("dialog", {
    name: "Send a friend request",
  });
  assert.equal(await request.getByRole("checkbox").first().isChecked(), false);
  await request.getByRole("checkbox", { name: /Ask to knock/ }).check();
  await request.getByRole("checkbox", { name: /Let them knock/ }).check();
  await request
    .getByRole("button", { name: "Send request", exact: true })
    .click();
  await request.waitFor({ state: "hidden" });
  await route(host, "profile", guest.id);
  await host.page
    .getByRole("button", { name: "Review friend request", exact: true })
    .click();
  await host.page
    .getByRole("checkbox", { name: /Allow Guest to knock/ })
    .check();
  await host.page
    .getByRole("button", { name: "Accept friendship", exact: true })
    .click();
  await host.page
    .getByRole("button", { name: "Knock on room", exact: true })
    .waitFor();
  console.log("Friend request approved");
  await route(guest, "profile", host.id);
  assert.equal(
    await guest.page
      .getByText(/Personal content is shared inside a room/)
      .count(),
    1,
  );
  assert.equal(
    await guest.page.getByRole("button", { name: /posts|feed/i }).count(),
    0,
  );
  await guest.page
    .getByRole("button", { name: "Knock on room", exact: true })
    .click();
  await guest.page
    .getByRole("textbox", { name: /message/i })
    .fill("Can I come over?");
  await guest.page
    .getByRole("dialog")
    .getByRole("button", { name: /Send knock|Knock$/ })
    .click();
  await route(host, "visits");
  await host.page
    .locator(".vs-request")
    .filter({ hasText: "Can I come over?" })
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await route(guest, "visits");
  await guest.page.getByRole("button", { name: /Ready to join/ }).click();
  await guest.page
    .getByRole("button", { name: "Join room", exact: true })
    .click();
  console.log("Knock accepted + joined");
  const chat = guest.page.getByRole("dialog", {
    name: "Host's room",
    exact: true,
  });
  await chat.waitFor();
  await guest.page.getByLabel("Chat message").fill("Hello from mobile");
  await guest.page.getByLabel("Send message", { exact: true }).click();
  await guest.page.getByText("Hello from mobile", { exact: true }).waitFor();
  await guest.page.getByLabel("Close chat", { exact: true }).click();
  await chat.waitFor({ state: "hidden" });
  await guest.page.waitForFunction(
    () => getComputedStyle(document.body).overflow !== "hidden",
  );
  assert.equal(
    await guest.page.locator(".room-scene .scene-person").count(),
    2,
  );
  await noOverflow(guest.page);
  await guest.page.screenshot({
    path: "/tmp/roomverse-mobile-room.png",
    fullPage: true,
  });
  await guest.page
    .getByRole("button", { name: "Ask to open something", exact: true })
    .click();
  const memoryCard = guest.page
    .locator(".vs-private-object")
    .filter({ hasText: "Memory box" });
  await memoryCard
    .getByRole("button", { name: "Ask to open", exact: true })
    .click();
  await guest.page
    .getByRole("button", { name: "Request permission", exact: true })
    .click();
  await route(host, "room");
  await host.page
    .locator(".vs-access-request")
    .getByRole("button", { name: "Reject", exact: true })
    .click();
  await memoryCard
    .getByRole("button", { name: "Ask to open", exact: true })
    .waitFor();
  await memoryCard
    .getByRole("button", { name: "Ask to open", exact: true })
    .click();
  await guest.page
    .getByRole("button", { name: "Request permission", exact: true })
    .click();
  await host.page
    .locator(".vs-access-request")
    .getByRole("button", { name: "Read", exact: true })
    .click();
  await memoryCard.getByRole("button", { name: "Open", exact: true }).click();
  await guest.page
    .getByRole("dialog", { name: "Memory box", exact: true })
    .waitFor();
  const sharedPhoto = guest.page.getByRole("img", {
    name: "Shared photo",
    exact: true,
  });
  await sharedPhoto.waitFor();
  await guest.page.waitForFunction(
    () => document.querySelector(".vs-shared-photo")?.naturalWidth > 0,
  );

  await guest.page.getByLabel("Close dialog").click();
  assert.equal(
    await chat.count(),
    0,
    "Closing private content does not reopen chat",
  );
  console.log("Chat + resources passed");
  const fr = await action(third, "friend.request", { userId: host.id });
  await action(host, "friend.respond", {
    requestId: fr.request.id,
    accept: true,
  });
  await host.page.getByRole("button", { name: "Invite", exact: true }).click();
  const invite = host.page.getByRole("dialog", { name: "Invite a friend" });
  await invite.getByRole("combobox").fill(third.handle);
  await invite.getByRole("option").first().click();
  await invite
    .getByRole("button", { name: "Send invite", exact: true })
    .click();
  await route(third, "visits");
  await third.page
    .locator(".vs-request")
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await third.page
    .getByRole("button", { name: "Join room", exact: true })
    .click();
  await third.page.getByLabel("Close chat").click();
  assert.equal(await third.page.locator(".scene-person").count(), 3);
  console.log("Invite + 3 avatars passed");
  await host.page
    .locator(".vs-people-strip")
    .locator("button")
    .filter({ hasText: "Guest" })
    .first()
    .click();
  await host.page
    .getByRole("button", {
      name: /Remove guest|Remove from room|Kick from room/,
    })
    .click();
  await guest.page
    .getByRole("heading", { name: "My room", exact: true })
    .waitFor();
  await third.page.getByRole("button", { name: "Leave", exact: true }).click();
  await third.page
    .getByRole("heading", { name: "My room", exact: true })
    .waitFor();
  for (const user of [host, guest]) {
    for (const [label, heading] of [
      ["Friends", "Friends"],
      ["Private tools", "Private tools"],
      ["Avatar studio", "Avatar studio"],
      ["Settings", "Settings"],
      ["Room", "My room"],
    ]) {
      if (user === guest) await user.page.getByLabel("Open navigation").click();
      await user.page
        .locator(".sidebar")
        .getByRole("button", { name: label, exact: true })
        .click();
      await user.page.locator("main h1").first().waitFor();
      assert.equal(
        await user.page.locator(".view-recovery").count(),
        0,
        `${label} renders`,
      );
      await noOverflow(user.page);
    }
  }
  await route(host, "avatar");
  await host.page.getByRole("button", { name: /A little playful/ }).click();
  await host.page
    .getByRole("button", { name: "Clothing & accessories", exact: true })
    .click();
  await host.page.getByRole("button", { name: /Everyday tee/ }).click();
  await host.page
    .getByRole("button", { name: "Save your look", exact: true })
    .click();
  await host.page
    .getByRole("button", { name: "Save your look", exact: true })
    .waitFor({ state: "visible" });
  await host.page.waitForFunction(
    () => document.querySelector(".avatar-page .page-heading button")?.disabled,
  );
  const appearance = await (
    await host.context.request.get(`${base}/api/bootstrap`)
  ).json();
  assert.equal(appearance.user.avatar.expression, "wink");
  assert.equal(appearance.user.avatar.outfitStyle, "tee");
  await route(host, "room");
  await host.page.screenshot({
    path: "/tmp/roomverse-desktop-room.png",
    fullPage: true,
  });
  await guest.page
    .getByRole("combobox", { name: "Search friends" })
    .fill(third.handle);
  await guest.page
    .locator("#friend-search-results")
    .getByRole("option")
    .first()
    .click();
  await guest.page
    .getByRole("heading", { name: "Third", exact: true })
    .waitFor();
  await guest.page.goBack();
  await guest.page
    .getByRole("heading", { name: "My room", exact: true })
    .waitFor();
  await guest.page.goto(`${base}/#/profile/does-not-exist`);
  await guest.page.getByText("Profile unavailable", { exact: true }).waitFor();
  assert.equal(
    await guest.page.getByText("Profile unavailable", { exact: true }).count(),
    1,
  );
  // A malformed response must show a recoverable view, never erase the shell.
  await host.page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, room: null } });
  });
  await host.page.reload();
  await host.page
    .getByRole("heading", { name: "This view couldn’t open", exact: true })
    .waitFor();
  assert.equal(await host.page.locator(".sidebar").count(), 1);
  await host.page.unroute("**/api/bootstrap");
  await host.page
    .getByRole("button", { name: "Open my room", exact: true })
    .click();
  await host.page
    .getByRole("heading", { name: "My room", exact: true })
    .waitFor();
  assert.deepEqual(errors, [], "No page errors across desktop/mobile flows");
  console.log(
    "Desktop/mobile rooms+friends: request approval, knock message, invite suggestions, avatars, overlay chat, grant/reject, kick/leave, navigation and no overflow passed.",
  );
} finally {
  for (const user of accounts) {
    try {
      await action(user, "account.delete", { password });
    } catch (error) {
      console.error("Cleanup:", error.message);
    }
  }
  await browser.close();
}
