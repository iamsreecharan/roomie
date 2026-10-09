import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "../server/index.js";

// Always use an isolated in-memory application, never a shared creator hall.
// TEST_ICE_SERVERS may provide a local TCP TURN fixture on managed browsers
// whose policy prevents direct UDP. It never changes application configuration.
const iceServers = process.env.TEST_ICE_SERVERS
  ? JSON.parse(process.env.TEST_ICE_SERVERS)
  : null;
if (iceServers)
  assert.ok(
    Array.isArray(iceServers) && iceServers.length,
    "TEST_ICE_SERVERS must contain an ICE server array",
  );
const mediaDir = await mkdtemp(join(tmpdir(), "roomverse-hall-media-"));
let runtime;
let browser;
const contexts = [];
const errors = [];
let summary;

async function api(context, baseURL, path, payload) {
  const response =
    payload === undefined
      ? await context.request.get(baseURL + path)
      : await context.request.post(baseURL + path, { data: payload });
  const data = await response.json();
  assert.ok(
    response.ok(),
    `${path}: HTTP ${response.status()} ${data.error || ""}`,
  );
  return data;
}

async function makeContext(baseURL, handle) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    ...(handle === "kira" ? { permissions: ["camera", "microphone"] } : {}),
  });
  contexts.push(context);
  // Preserve the loaded code while collaborators edit files under Vite.
  await context.route("**/@vite/client", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "transport.connect(createHMRHandler(handleMessage));",
      "",
    );
    await route.fulfill({ response, body });
  });
  if (iceServers)
    await context.route("**/api/config", async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      await route.fulfill({ response, json: { ...config, iceServers } });
    });
  await context.addInitScript(() => {
    window.__hallMediaPeers = [];
    window.__hallMediaStreams = [];
    window.__hallMediaDeviceRequests = 0;
    const OriginalPeer = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends OriginalPeer {
      constructor(...args) {
        super(...args);
        window.__hallMediaPeers.push(this);
      }
    };
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (...args) => {
      window.__hallMediaDeviceRequests++;
      const stream = await getUserMedia(...args);
      window.__hallMediaStreams.push(stream);
      return stream;
    };
  });
  await api(context, baseURL, "/api/auth/demo", { handle });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${handle}: ${error.message}`));
  return { context, page };
}

async function rtpStats(page) {
  return page.evaluate(async () => {
    const inbound = { audio: 0, video: 0 };
    const outbound = { audio: 0, video: 0 };
    for (const pc of window.__hallMediaPeers) {
      for (const stats of (await pc.getStats()).values()) {
        const kind = stats.kind || stats.mediaType;
        if (stats.type === "inbound-rtp" && kind in inbound)
          inbound[kind] += stats.bytesReceived || 0;
        if (stats.type === "outbound-rtp" && kind in outbound)
          outbound[kind] += stats.bytesSent || 0;
      }
    }
    return { inbound, outbound };
  });
}

try {
  runtime = await createServer({
    development: true,
    dbPath: ":memory:",
    mediaDir,
    allowDemo: true,
  });
  await new Promise((resolve) =>
    runtime.httpServer.listen(0, "127.0.0.1", resolve),
  );
  const baseURL = `http://127.0.0.1:${runtime.httpServer.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const creator = await makeContext(baseURL, "kira");
  const viewer = await makeContext(baseURL, "mika");
  const bootstrap = await api(creator.context, baseURL, "/api/bootstrap");
  const hall = bootstrap.halls.find(
    (item) => item.ownerId === bootstrap.user.id,
  );
  assert.ok(hall, "Isolated demo creator must have a hall");
  await api(creator.context, baseURL, "/api/action", {
    type: "hall.live",
    hallId: hall.id,
    live: true,
  });
  await Promise.all([
    creator.page.goto(`${baseURL}/?hall=${hall.id}`),
    viewer.page.goto(`${baseURL}/?hall=${hall.id}`),
  ]);
  await creator.page
    .getByRole("button", { name: "Broadcast video", exact: true })
    .waitFor();
  await viewer.page
    .getByRole("button", { name: "Watch live", exact: true })
    .waitFor();
  for (const person of [creator, viewer])
    assert.equal(
      await person.page.evaluate(() => window.__hallMediaDeviceRequests),
      0,
      "No devices are captured on render",
    );
  await creator.page
    .getByRole("button", { name: "Broadcast video", exact: true })
    .click();
  await creator.page
    .getByRole("button", { name: "End broadcast", exact: true })
    .waitFor();
  await viewer.page
    .getByRole("button", { name: "Watch live", exact: true })
    .click();
  await viewer.page.waitForFunction(
    () =>
      [...document.querySelectorAll(".rv-media-stage video")].some(
        (video) => video.videoWidth > 0,
      ) &&
      window.__hallMediaPeers.some(
        (peer) => peer.connectionState === "connected",
      ),
    null,
    { timeout: 25_000 },
  );
  await creator.page.waitForFunction(
    () =>
      window.__hallMediaPeers.some(
        (peer) => peer.connectionState === "connected",
      ),
    null,
    { timeout: 25_000 },
  );
  await viewer.page.waitForFunction(
    async () => {
      for (const pc of window.__hallMediaPeers) {
        const stats = [...(await pc.getStats()).values()];
        const received = (kind) =>
          stats.some(
            (item) =>
              item.type === "inbound-rtp" &&
              (item.kind || item.mediaType) === kind &&
              item.bytesReceived > 0,
          );
        if (received("audio") && received("video")) return true;
      }
      return false;
    },
    null,
    { timeout: 15_000 },
  );
  const audience = await viewer.page.evaluate(() => ({
    deviceRequests: window.__hallMediaDeviceRequests,
    sendingTracks: window.__hallMediaPeers.flatMap((pc) =>
      pc
        .getSenders()
        .map((sender) => sender.track?.kind)
        .filter(Boolean),
    ),
    video: [...document.querySelectorAll(".rv-media-stage video")].map(
      (video) => ({ width: video.videoWidth, height: video.videoHeight }),
    ),
  }));
  assert.equal(
    audience.deviceRequests,
    0,
    "Watching must never request audience devices",
  );
  assert.deepEqual(
    audience.sendingTracks,
    [],
    "Audience must send no media tracks",
  );
  const traffic = {
    creator: await rtpStats(creator.page),
    viewer: await rtpStats(viewer.page),
  };
  for (const kind of ["audio", "video"]) {
    assert.ok(
      traffic.creator.outbound[kind] > 0,
      `Creator sends real ${kind} RTP bytes`,
    );
    assert.ok(
      traffic.viewer.inbound[kind] > 0,
      `Viewer receives real ${kind} RTP bytes`,
    );
    assert.equal(
      traffic.viewer.outbound[kind],
      0,
      `Viewer sends no ${kind} media`,
    );
  }
  await creator.page
    .getByRole("button", { name: "End broadcast", exact: true })
    .click();
  await creator.page.waitForFunction(
    () =>
      window.__hallMediaStreams.length > 0 &&
      window.__hallMediaStreams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ) &&
      window.__hallMediaPeers.every(
        (peer) => peer.connectionState === "closed",
      ),
    null,
    { timeout: 10_000 },
  );
  await viewer.page.waitForFunction(
    () =>
      window.__hallMediaPeers.length > 0 &&
      window.__hallMediaPeers.every(
        (peer) => peer.connectionState === "closed",
      ),
    null,
    { timeout: 10_000 },
  );
  assert.deepEqual(errors, [], "No browser runtime errors");
  summary = {
    ok: true,
    browsers: 2,
    audience,
    traffic,
    creatorCaptureStopped: true,
    viewerConnectionClosed: true,
    scope:
      "Chromium fake-device integration on localhost with optional test TURN; no real-device, Internet NAT, or 50-stream capacity claim",
  };
} catch (error) {
  console.error(`Hall media integration failed: ${error.message}`);
  if (errors.length) console.error(errors.join("\n"));
  for (const context of contexts)
    for (const page of context.pages()) {
      const diagnostic = await page
        .evaluate(() => ({
          deviceRequests: window.__hallMediaDeviceRequests,
          peers: window.__hallMediaPeers?.map((peer) => ({
            connection: peer.connectionState,
            ice: peer.iceConnectionState,
            signaling: peer.signalingState,
          })),
          mediaText: document.querySelector(".rv-media-call")?.textContent,
        }))
        .catch(() => null);
      console.error(JSON.stringify(diagnostic));
    }
  console.error(
    "If browser policy blocks direct UDP, supply TEST_ICE_SERVERS with an authorized TURN TCP/TLS relay; keep managed browser policy enabled.",
  );
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
  await runtime?.close();
  await rm(mediaDir, { recursive: true, force: true });
  if (summary) console.log(JSON.stringify(summary, null, 2));
}
