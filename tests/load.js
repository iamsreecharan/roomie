import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { randomBytes } from "node:crypto";
import { io as connectSocket } from "socket.io-client";

const baseURL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const count = Number(process.env.LOAD_USERS || 50);
const rounds = Number(process.env.LOAD_ROUNDS || 6);
const p95Limit = Number(process.env.LOAD_P95_MS || 2000);
assert.ok(
  Number.isInteger(count) && count >= 20 && count <= 50,
  "LOAD_USERS must be an integer between 20 and 50",
);
assert.ok(
  Number.isInteger(rounds) && rounds >= 1 && rounds <= 50,
  "LOAD_ROUNDS must be between 1 and 50",
);
const runId = randomBytes(5).toString("hex");
const password = `Load-only-${randomBytes(16).toString("hex")}`;
const accounts = [];
const latencies = [];
const failures = [];
let connected = 0;
let refreshEvents = 0;
let hallId;
let baseline = 0;
let summary;

async function request(account, path, body, measure = true) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseURL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(account.cookie ? { Cookie: account.cookie } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length)
      account.cookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        `${path} HTTP ${response.status}: ${data.error || data.message || "request failed"}`,
      );
    if (measure) latencies.push(performance.now() - started);
    return data;
  } catch (error) {
    if (measure) failures.push({ path, error: error.message });
    throw error;
  }
}

async function batch(items, limit, work) {
  let offset = 0;
  const results = [];
  while (offset < items.length) {
    const group = await Promise.allSettled(
      items.slice(offset, offset + limit).map(work),
    );
    results.push(...group);
    offset += limit;
  }
  return results;
}

function socketConnect(account) {
  return new Promise((resolve, reject) => {
    const socket = connectSocket(baseURL, {
      transports: ["websocket"],
      extraHeaders: { Cookie: account.cookie },
      forceNew: true,
      reconnection: false,
      timeout: 10_000,
    });
    account.socket = socket;
    socket.on("refresh", () => {
      refreshEvents += 1;
    });
    socket.once("connect", () => {
      connected += 1;
      resolve(socket);
    });
    socket.once("connect_error", reject);
  });
}

try {
  await request({}, "/api/health", undefined, false);
  console.log(
    `Roomverse capacity check: ${count} real accounts, ${count} authenticated sockets, ${rounds} request rounds.`,
  );
  console.log(
    "This checks API, Socket.IO and aggregate Hall attendance. It does not measure voice/video or production network capacity.",
  );

  const registrations = await batch(
    Array.from({ length: count }, (_, index) => index),
    5,
    async (index) => {
      const account = { cookie: "", handle: `load_${runId}_${index}` };
      await request(
        account,
        "/api/auth/register",
        {
          handle: account.handle,
          name: `Capacity participant ${index + 1}`,
          email: `${account.handle}@example.test`,
          password,
          age: 24,
          consent: true,
        },
        false,
      );
      accounts.push(account);
      return account;
    },
  );
  const registrationErrors = registrations.filter(
    (item) => item.status === "rejected",
  );
  assert.equal(
    registrationErrors.length,
    0,
    `Account creation failed: ${registrationErrors.map((item) => item.reason.message).join("; ")}`,
  );
  const initial = await request(
    accounts[0],
    "/api/bootstrap",
    undefined,
    false,
  );
  const hall = initial.halls.find(
    (item) => item.published && item.access === "public",
  );
  assert.ok(
    hall,
    "A published public Hall is required for the shared-attendance check",
  );
  hallId = hall.id;
  baseline = hall.attendance;

  const socketResults = await Promise.allSettled(accounts.map(socketConnect));
  const socketErrors = socketResults.filter(
    (item) => item.status === "rejected",
  );
  assert.equal(
    socketErrors.length,
    0,
    `Socket authentication failed: ${socketErrors.map((item) => item.reason.message).join("; ")}`,
  );
  assert.equal(connected, count);
  await Promise.all(
    accounts.map(async (account) => {
      await request(account, "/api/action", { type: "hall.enter", hallId });
      account.socket.emit("hall:join", { hallId });
    }),
  );

  for (let round = 0; round < rounds; round += 1) {
    const requests = await Promise.allSettled(
      accounts.map(async (account) => {
        const bootstrap = await request(account, "/api/bootstrap");
        assert.equal(
          bootstrap.user.handle,
          account.handle,
          "Authenticated identity changed under load",
        );
        assert.ok(
          bootstrap.resources.every(
            (resource) =>
              !resource.ownerId || resource.ownerId === bootstrap.user.id,
          ),
          "Private resources crossed identities",
        );
        await request(account, "/api/action", {
          type: "profile.update",
          presence: round % 2 ? "busy" : "available",
        });
        account.socket.emit("hall:heartbeat", { hallId });
      }),
    );
    for (const failed of requests.filter(
      (item) => item.status === "rejected",
    )) {
      if (!failures.some((item) => item.error === failed.reason.message))
        failures.push({ path: "assertion", error: failed.reason.message });
    }
  }

  const final = await request(accounts[0], "/api/bootstrap");
  const attendance = final.halls.find((item) => item.id === hallId).attendance;
  assert.equal(
    attendance,
    baseline + count,
    "Hall attendance must deduplicate multiple API/socket joins by each user",
  );
  assert.equal(
    accounts.filter((account) => account.socket.connected).length,
    count,
    "All sockets should remain connected",
  );
  assert.ok(
    refreshEvents >= count,
    "Connected users should receive live state notifications",
  );
  latencies.sort((a, b) => a - b);
  const percentile = (p) =>
    Math.round(
      latencies[
        Math.min(latencies.length - 1, Math.floor(latencies.length * p))
      ] || 0,
    );
  summary = {
    accounts: count,
    concurrentSockets: connected,
    hallAttendanceAdded: attendance - baseline,
    measuredRequests: latencies.length,
    errors: failures.length,
    refreshEvents,
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      max: Math.round(latencies.at(-1) || 0),
    },
    scope:
      "Local API, realtime notifications and Hall attendance; no voice/video capacity claim",
  };
  assert.equal(failures.length, 0, JSON.stringify(failures));
  assert.ok(
    summary.latencyMs.p95 <= p95Limit,
    `p95 ${summary.latencyMs.p95}ms exceeds ${p95Limit}ms`,
  );
} catch (error) {
  console.error(`Capacity check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  const cleanupErrors = [];
  await batch(accounts, 5, async (account) => {
    try {
      if (hallId)
        await request(
          account,
          "/api/action",
          { type: "hall.leave", hallId },
          false,
        );
      account.socket?.disconnect();
      await request(
        account,
        "/api/action",
        { type: "account.delete", password },
        false,
      );
    } catch (error) {
      account.socket?.disconnect();
      cleanupErrors.push(`${account.handle}: ${error.message}`);
    }
  });
  if (summary) console.log(JSON.stringify(summary, null, 2));
  if (cleanupErrors.length) {
    console.error(
      `Cleanup failed for ${cleanupErrors.length} accounts: ${cleanupErrors.join("; ")}`,
    );
    process.exitCode = 1;
  } else console.log(`Cleaned up ${accounts.length} temporary accounts.`);
}
