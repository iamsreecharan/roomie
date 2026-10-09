import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const password = `Media-test-${randomBytes(16).toString("hex")}`;
const runId = randomBytes(5).toString("hex");
const testIceServers = process.env.TEST_ICE_SERVERS
  ? JSON.parse(process.env.TEST_ICE_SERVERS)
  : null;
if (testIceServers)
  assert.ok(
    Array.isArray(testIceServers) && testIceServers.length > 0,
    "TEST_ICE_SERVERS must contain an ICE server array",
  );
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const accounts = [];
const errors = [];
let summary;

async function api(account, path, payload) {
  const response =
    payload === undefined
      ? await account.context.request.get(`${baseURL}${path}`)
      : await account.context.request.post(`${baseURL}${path}`, {
          data: payload,
        });
  const data = await response.json();
  assert.ok(
    response.ok(),
    `${path}: HTTP ${response.status()} ${data.error || ""}`,
  );
  return data;
}

async function account(role) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1360, height: 1000 },
    permissions: ["camera", "microphone"],
  });
  // Freeze this browser's module snapshot while collaborators edit source files.
  // A Vite full reload would tear down media and invalidate the connection test.
  await context.route("**/@vite/client", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "transport.connect(createHMRHandler(handleMessage));",
      "",
    );
    await route.fulfill({ response, body });
  });
  if (testIceServers)
    await context.route("**/api/config", async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      await route.fulfill({
        response,
        json: { ...config, iceServers: testIceServers },
      });
    });
  const handle = `media${role}_${runId}`;
  const user = { context, handle };
  await api(user, "/api/auth/register", {
    handle,
    name: `Media ${role}`,
    email: `${handle}@example.test`,
    password,
    age: 24,
    consent: true,
  });
  accounts.push(user);
  user.id = (await api(user, "/api/bootstrap")).user.id;
  await context.addInitScript(() => {
    window.__roomverseTestPeers = [];
    window.__roomverseTestStreams = [];
    const Peer = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Peer {
      constructor(...args) {
        super(...args);
        window.__roomverseTestPeers.push(this);
      }
    };
    const capture = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await capture(...args);
      window.__roomverseTestStreams.push(stream);
      return stream;
    };
  });
  user.page = await context.newPage();
  user.page.on("pageerror", (error) =>
    errors.push(`${role}: ${error.stack || error.message}`),
  );
  user.page.on("console", (message) => {
    if (/useEffect|destroy is not|cleanup/i.test(message.text()))
      console.error(`${role} browser: ${message.text()}`);
  });
  return user;
}

const act = (account, type, payload = {}) =>
  api(account, "/api/action", { type, ...payload });

async function callStats(page) {
  return page.evaluate(async () => {
    const peer = window.__roomverseTestPeers.find(
      (item) => item.connectionState === "connected",
    );
    if (!peer) return null;
    const stats = await peer.getStats();
    const inbound = { audio: 0, video: 0 };
    const outbound = { audio: 0, video: 0 };
    stats.forEach((item) => {
      const kind = item.kind || item.mediaType;
      if (item.type === "inbound-rtp" && kind in inbound)
        inbound[kind] += item.bytesReceived || 0;
      if (item.type === "outbound-rtp" && kind in outbound)
        outbound[kind] += item.bytesSent || 0;
    });
    return {
      state: peer.connectionState,
      inbound,
      outbound,
      liveReceiverTracks: peer
        .getReceivers()
        .filter((receiver) => receiver.track?.readyState === "live")
        .map((receiver) => receiver.track.kind),
    };
  });
}

try {
  const host = await account("host");
  const guest = await account("guest");
  await act(guest, "knock.create", {
    userId: host.id,
    reason: "Create together?",
  });
  const request = (await api(host, "/api/bootstrap")).requests.find(
    (item) =>
      item.fromId === guest.id &&
      item.type === "knock" &&
      item.status === "pending",
  );
  await act(host, "request.respond", {
    requestId: request.id,
    accept: true,
    permissions: {
      chat: true,
      voice: true,
      screen: true,
      interact: false,
      invite: false,
    },
  });
  await act(guest, "session.join", { requestId: request.id });
  for (const user of [host, guest]) {
    await user.page.goto("/");
    await user.page
      .getByRole("button", { name: "Visits & hangouts", exact: true })
      .click();
    await user.page
      .getByRole("region", { name: "Private room call" })
      .waitFor();
    assert.equal(
      await user.page.evaluate(() => window.__roomverseTestStreams.length),
      0,
      "Devices must remain off until explicit join",
    );
  }
  await host.page
    .getByRole("button", { name: "Join video", exact: true })
    .click();
  await guest.page
    .getByRole("button", { name: "Join video", exact: true })
    .click();
  for (const user of [host, guest]) {
    await user.page.waitForFunction(
      () =>
        window.__roomverseTestPeers.some(
          (peer) =>
            peer.connectionState === "connected" &&
            peer
              .getReceivers()
              .some(
                (receiver) =>
                  receiver.track?.kind === "audio" &&
                  receiver.track.readyState === "live",
              ) &&
            peer
              .getReceivers()
              .some(
                (receiver) =>
                  receiver.track?.kind === "video" &&
                  receiver.track.readyState === "live",
              ),
        ),
      null,
      { timeout: 20_000 },
    );
    await user.page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll(".rv-media-tile:not(.is-local) video"),
        ].some(
          (video) =>
            video.videoWidth > 0 &&
            video.srcObject
              ?.getVideoTracks()
              .some((track) => track.readyState === "live" && !track.muted),
        ),
      null,
      { timeout: 10_000 },
    );
    await user.page.waitForFunction(
      async () => {
        const peer = window.__roomverseTestPeers.find(
          (item) => item.connectionState === "connected",
        );
        if (!peer) return false;
        const stats = await peer.getStats();
        const inbound = { audio: 0, video: 0 };
        const outbound = { audio: 0, video: 0 };
        stats.forEach((item) => {
          const kind = item.kind || item.mediaType;
          if (item.type === "inbound-rtp" && kind in inbound)
            inbound[kind] += item.bytesReceived || 0;
          if (item.type === "outbound-rtp" && kind in outbound)
            outbound[kind] += item.bytesSent || 0;
        });
        return (
          Object.values(inbound).every((bytes) => bytes > 0) &&
          Object.values(outbound).every((bytes) => bytes > 0)
        );
      },
      null,
      { timeout: 10_000 },
    );
  }
  const hostStats = await callStats(host.page);
  const guestStats = await callStats(guest.page);
  await act(host, "session.permissions", {
    userId: guest.id,
    permissions: {
      chat: true,
      voice: false,
      screen: false,
      interact: false,
      invite: false,
    },
  });
  await guest.page.waitForFunction(
    () =>
      window.__roomverseTestStreams.length > 0 &&
      window.__roomverseTestStreams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ) &&
      window.__roomverseTestPeers.every(
        (peer) => peer.connectionState === "closed",
      ),
    null,
    { timeout: 10_000 },
  );
  await host.page.waitForFunction(
    () =>
      window.__roomverseTestPeers.length > 0 &&
      window.__roomverseTestPeers.every(
        (peer) => peer.connectionState === "closed",
      ),
    null,
    { timeout: 10_000 },
  );
  await act(host, "session.end");
  await host.page.waitForFunction(
    () =>
      window.__roomverseTestStreams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    null,
    { timeout: 10_000 },
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  summary = {
    browsers: 2,
    explicitDeviceConsent: true,
    connected: true,
    host: hostStats,
    guest: guestStats,
    guestPermissionRevocationStoppedCapture: true,
    sessionEndStoppedHostCapture: true,
    testIceOverride: !!testIceServers,
    scope:
      "Chromium fake-device integration on localhost; configured test ICE relay when supplied. No real-device, group-capacity or Internet media claim.",
  };
} catch (error) {
  console.error(`Media integration failed: ${error.message}`);
  if (errors.length) console.error(errors.join("\n"));
  for (let index = 0; index < accounts.length; index += 1) {
    await accounts[index].page
      ?.screenshot({
        path: `/tmp/roomverse-media-failure-${index}.png`,
        fullPage: true,
      })
      .catch(() => {});
    const diagnostics = await accounts[index].page
      ?.evaluate(() => ({
        capture: window.__roomverseTestStreams?.map((stream) =>
          stream
            .getTracks()
            .map((track) => ({
              kind: track.kind,
              state: track.readyState,
              muted: track.muted,
            })),
        ),
        peers: window.__roomverseTestPeers?.map((peer) => ({
          connection: peer.connectionState,
          signaling: peer.signalingState,
          ice: peer.iceConnectionState,
          transceivers: peer
            .getTransceivers()
            .map((transceiver) => ({
              direction: transceiver.direction,
              currentDirection: transceiver.currentDirection,
              sender: transceiver.sender.track && {
                kind: transceiver.sender.track.kind,
                readyState: transceiver.sender.track.readyState,
                enabled: transceiver.sender.track.enabled,
              },
              receiver: transceiver.receiver.track && {
                kind: transceiver.receiver.track.kind,
                readyState: transceiver.receiver.track.readyState,
                muted: transceiver.receiver.track.muted,
              },
            })),
        })),
        mediaText: document.querySelector(".rv-media-call")?.textContent,
      }))
      .catch(() => null);
    const transportStats = await callStats(accounts[index].page).catch(
      () => null,
    );
    console.error(
      JSON.stringify({ account: index, diagnostics, transportStats }),
    );
  }
  process.exitCode = 1;
} finally {
  for (const user of accounts) {
    await act(user, "account.delete", { password }).catch((error) => {
      console.error(`Test account cleanup failed: ${error.message}`);
      process.exitCode = 1;
    });
    await user.context.close();
  }
  await browser.close();
  if (summary) console.log(JSON.stringify(summary, null, 2));
}
