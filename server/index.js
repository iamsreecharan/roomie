import express from "express";
import { Server } from "socket.io";
import { createServer as createHttpServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import {
  createStore,
  seedStore,
  addHome,
  id,
  now,
  defaults,
  avatar,
  hashPassword,
  verifyPassword,
} from "./store.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = ["sage", "clay", "midnight", "lavender"];
const VARIANTS = ["sunset", "bloom", "tide", "orbit"];
const PERMISSIONS = ["chat", "voice", "screen", "interact", "invite"];
const RESOURCE_TYPES = [
  "tasks",
  "journal",
  "planner",
  "memories",
  "whiteboard",
];
const fail = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
const text = (v, max = 1000, min = 0) => {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    fail(`Expected text between ${min} and ${max} characters.`);
  return v.trim();
};
const pick = (value, list, label = "option") => {
  if (!list.includes(value)) fail(`Invalid ${label}.`);
  return value;
};
const flag = (v) => {
  if (typeof v !== "boolean") fail("Expected a true or false value.");
  return v;
};
const url = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || v.length > 2048) fail("Invalid URL.");
  if (/^\/media\/[a-zA-Z0-9_.-]+$/.test(v)) return v;
  try {
    if (new URL(v).protocol === "https:") return v;
  } catch {}
  fail("Use a secure HTTPS URL or an uploaded file.");
};
const cookies = (header) =>
  Object.fromEntries(
    (header || "")
      .split(";")
      .map((x) => x.trim().split("="))
      .filter((x) => x.length === 2)
      .map(([k, v]) => {
        try {
          return [k, decodeURIComponent(v)];
        } catch {
          return [k, ""];
        }
      }),
  );
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const safeUser = (user) => ({
  id: user.id,
  handle: user.handle,
  name: user.name,
  bio: user.bio,
  avatar: user.avatar,
  verified: user.verified,
  role: user.role,
  verification: user.verification,
  presence: user.settings.onlineVisible ? user.presence : "hidden",
  createdAt: user.createdAt,
});
const permissions = (input = {}) =>
  Object.fromEntries(PERMISSIONS.map((key) => [key, input[key] === true]));

export async function createServer(options = {}) {
  const production = process.env.NODE_ENV === "production";
  const allowDemo =
    options.allowDemo ??
    (process.env.ALLOW_DEMO === "true" ||
      (!production && process.env.ALLOW_DEMO !== "false"));
  const development = options.development ?? false;
  const mediaDir =
    options.mediaDir ?? (process.env.MEDIA_DIR || join(ROOT, ".data", "media"));
  const store = createStore(
    options.dbPath ??
      process.env.DB_PATH ??
      join(ROOT, ".data", "roomverse.sqlite"),
  );
  const { db } = store;
  mkdirSync(mediaDir, { recursive: true, mode: 0o700 });
  await seedStore(store, allowDemo);
  const dummyPasswordHash = await hashPassword(randomBytes(32).toString("hex"));
  const app = express();
  if (production) app.set("trust proxy", 1);
  const httpServer = createHttpServer(app);
  const activeSessions = new Map(),
    memberships = new Map(),
    hallAttendance = new Map(),
    socketUsers = new Map(),
    rateBuckets = new Map(),
    oauthStates = new Map(),
    proposals = new Map();
  const publicUrl = (
    options.publicUrl ??
    (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "")
  ).replace(/\/$/, "");
  const roomieApiKey = process.env.ROOMIE_API_KEY,
    roomieApiUrl =
      process.env.ROOMIE_API_URL ??
      "https://api.openai.com/v1/chat/completions",
    roomieModel = process.env.ROOMIE_MODEL ?? "gpt-4.1-mini";
  const roomieMode = roomieApiKey ? "provider" : "local";
  const googleClientId = process.env.GOOGLE_CLIENT_ID,
    googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleEnabled = !!(googleClientId && googleClientSecret && publicUrl);
  const publicIceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  const authenticatedIceServers = [...publicIceServers];
  if (
    process.env.TURN_URL &&
    process.env.TURN_USERNAME &&
    process.env.TURN_CREDENTIAL
  ) {
    if (!/^turns?:[^\s]+$/.test(process.env.TURN_URL))
      throw new Error("TURN_URL must be a valid turn: or turns: URL.");
    authenticatedIceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  const sameOrigin = (origin) => {
    if (!origin) return true;
    try {
      return (
        new URL(origin).origin ===
        (publicUrl ? new URL(publicUrl).origin : new URL(origin).origin)
      );
    } catch {
      return false;
    }
  };
  const io = new Server(httpServer, {
    maxHttpBufferSize: 64 * 1024,
    cors: {
      origin: (origin, cb) => cb(null, sameOrigin(origin)),
      credentials: true,
    },
    allowRequest: (req, cb) => {
      const origin = req.headers.origin;
      const expected =
        publicUrl ||
        `${req.connection.encrypted ? "https" : "http"}://${req.headers.host}`;
      try {
        cb(
          null,
          !origin || new URL(origin).origin === new URL(expected).origin,
        );
      } catch {
        cb(null, false);
      }
    },
  });
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin
    ) {
      const expected = publicUrl || `${req.protocol}://${req.get("host")}`;
      try {
        if (new URL(req.headers.origin).origin !== new URL(expected).origin)
          return res.status(403).json({
            error: "This request must come from the Roomverse application.",
          });
      } catch {
        return res.status(403).json({ error: "Invalid request origin." });
      }
    }
    next();
  });
  app.use(express.json({ limit: "30mb" }));
  app.use((req, res, next) => {
    if (
      req.path.startsWith("/api/") &&
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res
        .status(400)
        .json({ error: "Send a JSON object with this request." });
    next();
  });

  function rate(key, limit = 180, windowMs = 60000) {
    const at = Date.now(),
      old = rateBuckets.get(key);
    const bucket =
      old && old.until > at ? old : { count: 0, until: at + windowMs };
    bucket.count++;
    rateBuckets.set(key, bucket);
    if (bucket.count > limit)
      fail("Slow down a little and try again shortly.", 429);
  }
  function getUser(userId) {
    const user = store.get(userId);
    if (!user || !user.handle) fail("Account not found.", 404);
    return user;
  }
  function entity(entityId, kind) {
    const row = store.get(entityId);
    if (
      !row ||
      (kind === "resource" && !RESOURCE_TYPES.includes(row.type)) ||
      (kind === "room" && !row.objects) ||
      (kind === "hall" && !row.artworks) ||
      (kind === "post" && !row.authorId) ||
      (kind === "request" && !row.fromId)
    )
      fail(`${kind} not found.`, 404);
    return row;
  }
  function authFromCookie(header) {
    const token = cookies(header).rv_session;
    if (!token) return null;
    const row = db
      .prepare("SELECT user_id,expires FROM auth_sessions WHERE token=?")
      .get(tokenHash(token));
    if (!row || row.expires <= Date.now()) return null;
    return store.get(row.user_id);
  }
  function requireAuth(req, res, next) {
    const user = authFromCookie(req.headers.cookie);
    if (!user)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.user = user;
    next();
  }
  function issueSession(res, userId) {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO auth_sessions VALUES(?,?,?)").run(
      tokenHash(token),
      userId,
      Date.now() + 7 * 86400000,
    );
    res.cookie("rv_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: production || publicUrl.startsWith("https:"),
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
  function blocked(a, b) {
    return store.has("block", a, b) || store.has("block", b, a);
  }
  function notify(userId, title, message) {
    if (!store.get(userId)) return;
    store.put(
      "notification",
      {
        id: id("notice_"),
        userId,
        title,
        text: message,
        read: false,
        createdAt: now(),
      },
      userId,
    );
    const notices = store
      .all("notification", userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const notice of notices.slice(100)) store.remove(notice.id);
    io.to(`user:${userId}`).emit("refresh");
  }
  function refresh(userIds) {
    for (const userId of new Set(userIds.filter(Boolean)))
      io.to(`user:${userId}`).emit("refresh");
  }
  function refreshAll() {
    io.emit("refresh");
  }
  function ownRoom(userId) {
    return store.all("room", userId)[0] ?? fail("Room not found.", 404);
  }
  function sessionFor(userId) {
    const sid = memberships.get(userId);
    return sid ? (activeSessions.get(sid) ?? null) : null;
  }
  function hostSession(userId) {
    const existing = sessionFor(userId);
    if (existing && existing.hostId !== userId)
      fail("Leave your current visit before hosting.", 409);
    if (existing) return existing;
    const room = ownRoom(userId),
      session = {
        id: id("session_"),
        roomId: room.id,
        hostId: userId,
        participants: [
          {
            userId,
            permissions: Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
            joinedAt: now(),
          },
        ],
        grants: [],
        startedAt: now(),
      };
    activeSessions.set(session.id, session);
    memberships.set(userId, session.id);
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === userId) socket.join(`session:${session.id}`);
    return session;
  }
  function revokeResources(session, userId) {
    const removed = session.grants.filter((g) => g.userId === userId);
    session.grants = session.grants.filter((g) => g.userId !== userId);
    if (removed.length)
      io.to(`user:${userId}`).emit("resources:revoked", {
        resourceIds: removed.map((g) => g.resourceId),
      });
  }
  function leaveSession(userId, event = "session:revoked") {
    const session = sessionFor(userId);
    if (!session) return;
    if (session.hostId === userId) return endSession(session);
    removeCallPeer(session, userId);
    revokeResources(session, userId);
    session.participants = session.participants.filter(
      (p) => p.userId !== userId,
    );
    memberships.delete(userId);
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === userId) {
        socket.leave(`session:${session.id}`);
        socket.emit(event, { sessionId: session.id });
      }
    refresh(session.participants.map((p) => p.userId).concat(userId));
  }
  function endSession(session) {
    for (const participant of session.participants) {
      removeCallPeer(session, participant.userId);
      revokeResources(session, participant.userId);
      memberships.delete(participant.userId);
      for (const socket of io.sockets.sockets.values())
        if (socket.data.userId === participant.userId) {
          socket.leave(`session:${session.id}`);
          socket.emit("session:ended", { sessionId: session.id });
        }
    }
    for (const request of store.all("request"))
      if (
        request.sessionId === session.id &&
        ["pending", "accepted"].includes(request.status)
      ) {
        request.status = "cancelled";
        store.put("request", request, request.toId);
      }
    activeSessions.delete(session.id);
    callPeers.delete(session.id);
    refresh(session.participants.map((p) => p.userId));
  }
  function cleanup() {
    const at = Date.now();
    db.prepare("DELETE FROM auth_sessions WHERE expires<?").run(at);
    for (const request of store.all("request"))
      if (
        ["pending", "accepted"].includes(request.status) &&
        Date.parse(request.expiresAt) <= at
      ) {
        request.status = "expired";
        store.put("request", request, request.toId);
      }
    for (const session of activeSessions.values()) {
      if (Date.parse(session.startedAt) + 8 * 3600000 <= at) {
        endSession(session);
        continue;
      }
      const expired = session.grants.filter((g) => g.expiresAt <= at);
      session.grants = session.grants.filter((g) => g.expiresAt > at);
      for (const grant of expired)
        io.to(`user:${grant.userId}`).emit("resources:revoked", {
          resourceIds: [grant.resourceId],
        });
    }
    for (const [key, b] of rateBuckets)
      if (b.until < at) rateBuckets.delete(key);
    for (const [key, s] of oauthStates)
      if (s.expires < at) oauthStates.delete(key);
    for (const [key, p] of proposals) if (p.expires < at) proposals.delete(key);
    for (const [hallId, entries] of hallAttendance) {
      for (const [userId, lastSeen] of entries)
        if (lastSeen + 90000 < at) entries.delete(userId);
      if (!entries.size) hallAttendance.delete(hallId);
    }
  }
  function readGrant(userId, resource) {
    if (resource.ownerId === userId) return { scope: "write" };
    const session = sessionFor(userId);
    if (!session || session.hostId !== resource.ownerId) return null;
    return (
      session.grants.find(
        (g) =>
          g.userId === userId &&
          g.resourceId === resource.id &&
          g.expiresAt > Date.now(),
      ) ?? null
    );
  }
  function canReadPost(userId, post) {
    if (
      blocked(userId, post.authorId) ||
      store.has("hidePost", userId, post.id)
    )
      return false;
    if (post.authorId === userId) return true;
    if (post.visibility === "public") return true;
    if (post.visibility === "followers")
      return store.has("follow", userId, post.authorId);
    return store.has("closeFriend", post.authorId, userId);
  }
  function canReadHall(userId, hall) {
    if (userId && blocked(userId, hall.ownerId)) return false;
    if (
      hall.ownerId === userId ||
      (userId && store.get(userId)?.role === "admin")
    )
      return true;
    if (!hall.published) return false;
    if (hall.access === "public") return true;
    if (hall.access === "followers")
      return !!userId && store.has("follow", userId, hall.ownerId);
    return !!userId && (hall.ticketUserIds || []).includes(userId);
  }
  function publicRoom(room) {
    return {
      id: room.id,
      ownerId: room.ownerId,
      theme: room.theme,
      version: room.version,
      objects: room.objects,
      history: false,
      resources: store
        .all("resource", room.ownerId)
        .map(({ id, type, title }) => ({ id, type, title })),
    };
  }
  function hallView(hall, userId) {
    return {
      ...hall,
      questionsEnabled: hall.questionsEnabled !== false,
      ticketUserIds: hall.ownerId === userId ? hall.ticketUserIds : undefined,
      attendance: hallAttendance.get(hall.id)?.size || 0,
      live: hall.live === true,
      artworks: hall.artworks.map((art) => ({
        ...art,
        saves: store.count("artSave", art.id),
        saved: userId ? store.has("artSave", userId, art.id) : false,
      })),
      events: hall.events.map((event) => ({
        ...event,
        rsvps: event.rsvps.length,
        rsvp: !!userId && event.rsvps.includes(userId),
      })),
    };
  }
  function bootstrap(user) {
    cleanup();
    const allUsers = store.all("user");
    const allHalls = store.all("hall").filter((h) => canReadHall(user.id, h));
    const current = sessionFor(user.id);
    const relevantRequests = store
      .all("request")
      .filter(
        (r) =>
          (r.fromId === user.id || r.toId === user.id) &&
          !blocked(r.fromId, r.toId),
      );
    const posts = store
      .all("post")
      .filter((p) => canReadPost(user.id, p))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({
        ...p,
        likes: store.count("like", p.id),
        liked: store.has("like", user.id, p.id),
        saved: store.has("postSave", user.id, p.id),
      }));
    const referenced = new Set(
      posts
        .map((p) => p.authorId)
        .concat(
          relevantRequests.flatMap((r) => [r.fromId, r.toId]),
          current?.participants.map((p) => p.userId) || [],
        ),
    );
    const own = ownRoom(user.id);
    return {
      user: {
        ...safeUser(user),
        presence: user.presence,
        settings: user.settings,
        needsConsent: !!user.needsConsent,
        googleLinked: !!db
          .prepare("SELECT google_sub FROM accounts WHERE user_id=?")
          .get(user.id)?.google_sub,
        hasPassword: !!db
          .prepare("SELECT password_hash FROM accounts WHERE user_id=?")
          .get(user.id)?.password_hash,
      },
      users: allUsers
        .filter(
          (u) =>
            u.id === user.id ||
            store.has("block", user.id, u.id) ||
            (!blocked(user.id, u.id) &&
              (u.settings.discoverable ||
                store.has("follow", user.id, u.id) ||
                referenced.has(u.id))),
        )
        .map((u) => ({
          ...safeUser(u),
          following: store.has("follow", user.id, u.id),
          closeFriend: store.has("closeFriend", user.id, u.id),
          followers: store.count("follow", u.id),
          blocked: store.has("block", user.id, u.id),
        })),
      room: { ...own, history: own.history.length > 0 },
      resources: store
        .all("resource", user.id)
        .map(({ ownerId, ...resource }) => resource),
      posts,
      requests: relevantRequests,
      session: current
        ? {
            ...current,
            room: publicRoom(entity(current.roomId, "room")),
            grants: current.grants
              .filter((g) => current.hostId === user.id || g.userId === user.id)
              .map(({ used, ...g }) => g),
          }
        : null,
      myVisits: relevantRequests.filter(
        (r) =>
          r.status === "accepted" &&
          r.type !== "access" &&
          (r.type === "knock" ? r.fromId === user.id : r.toId === user.id),
      ),
      halls: allHalls.map((h) => hallView(h, user.id)),
      hallQuestions: store
        .all("question")
        .filter(
          (q) =>
            allHalls.some((h) => h.id === q.hallId) &&
            (q.approved ||
              q.userId === user.id ||
              entity(q.hallId, "hall").ownerId === user.id ||
              user.role === "admin"),
        ),
      notifications: store
        .all("notification", user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      blocks: store.targets("block", user.id),
      reports:
        user.role === "admin"
          ? store.all("report")
          : store.all("report", user.id),
      verificationRequests:
        user.role === "admin" ? store.all("verification") : [],
      roomieLog: store
        .all("roomieLog", user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30),
      roomieMode,
      demoEnabled: allowDemo,
    };
  }

  app.get("/api/health", (req, res) =>
    res.json({ ok: true, name: "Roomverse", storage: "sqlite", roomieMode }),
  );
  app.get("/api/config", (req, res) =>
    res.json({
      googleEnabled,
      demoEnabled: allowDemo,
      roomieMode,
      iceServers: authFromCookie(req.headers.cookie)
        ? authenticatedIceServers
        : publicIceServers,
    }),
  );
  app.get("/api/public/halls", (req, res) =>
    res.json({
      halls: store
        .all("hall")
        .filter((h) => h.published && h.access === "public")
        .map((h) => ({
          ...hallView(h, null),
          artworkCount: h.artworks.length,
        })),
      creators: store
        .all("user")
        .filter((u) => u.verified)
        .map(safeUser),
    }),
  );
  app.post("/api/auth/register", async (req, res) => {
    rate(`register:${req.ip}`, allowDemo ? 120 : 20, 3600000);
    const handle = text(req.body.handle, 24, 3).toLowerCase();
    if (!/^[a-z0-9_]+$/.test(handle))
      fail("Use letters, numbers, and underscores in your handle.");
    const name = text(req.body.name, 60, 1),
      email = text(req.body.email, 254, 3).toLowerCase(),
      password = text(req.body.password, 128, 10);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("Enter a valid email address.");
    if (
      !Number.isFinite(Number(req.body.age)) ||
      Number(req.body.age) < 18 ||
      Number(req.body.age) > 120 ||
      req.body.consent !== true
    )
      fail(
        "Roomverse is for adults 18 and older. Accept the community and privacy terms to continue.",
      );
    if (
      store.all("user").some((u) => u.handle === handle) ||
      db.prepare("SELECT 1 FROM accounts WHERE email=?").get(email)
    )
      fail("That handle or email is already in use.", 409);
    const hash = await hashPassword(password);
    if (
      store.all("user").some((u) => u.handle === handle) ||
      db.prepare("SELECT 1 FROM accounts WHERE email=?").get(email)
    )
      fail("That handle or email is already in use.", 409);
    const user = {
      id: id("user_"),
      handle,
      name,
      bio: "",
      avatar: avatar(),
      verified: false,
      role: "user",
      verification: "NOT_APPLIED",
      presence: "open",
      settings: defaults(),
      needsConsent: false,
      createdAt: now(),
    };
    db.exec("BEGIN");
    try {
      store.put("user", user);
      db.prepare("INSERT INTO accounts VALUES(?,?,?,NULL)").run(
        user.id,
        email,
        hash,
      );
      addHome(store, user);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    issueSession(res, user.id);
    res.status(201).json({ user: safeUser(user) });
  });
  app.post("/api/auth/login", async (req, res) => {
    rate(`login:${req.ip}`, 100, 60000);
    const email = text(req.body.email, 254, 3).toLowerCase();
    const password = text(req.body.password, 128, 1);
    const account = db
      .prepare("SELECT * FROM accounts WHERE email=?")
      .get(email);
    const valid = await verifyPassword(
      password,
      account?.password_hash ?? dummyPasswordHash,
    );
    if (!valid || !account?.password_hash)
      fail("Email or password is incorrect.", 401);
    issueSession(res, account.user_id);
    res.json({ user: safeUser(getUser(account.user_id)) });
  });
  app.post("/api/auth/demo", (req, res) => {
    if (!allowDemo) fail("Demo sign-in is disabled in this environment.", 403);
    rate(`demo:${req.ip}`, 120, 60000);
    const handle = pick(
      req.body.handle,
      ["mika", "kira", "noah", "admin"],
      "demo account",
    );
    const user = getUser(`user_${handle}`);
    issueSession(res, user.id);
    res.json({ user: safeUser(user), demo: true });
  });
  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const token = cookies(req.headers.cookie).rv_session;
    if (token)
      db.prepare("DELETE FROM auth_sessions WHERE token=?").run(
        tokenHash(token),
      );
    leaveSession(req.user.id);
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === req.user.id) socket.disconnect(true);
    res.clearCookie("rv_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/auth/google", (req, res) => {
    if (!googleEnabled)
      fail(
        "Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and PUBLIC_URL in environment settings.",
        503,
      );
    rate(`google:${req.ip}`, 20, 60000);
    const state = randomBytes(32).toString("hex");
    const linkedUser = authFromCookie(req.headers.cookie);
    const linkedToken = cookies(req.headers.cookie).rv_session;
    oauthStates.set(tokenHash(state), {
      expires: Date.now() + 10 * 60000,
      userId: linkedUser?.id,
      sessionHash: linkedUser && linkedToken ? tokenHash(linkedToken) : null,
    });
    res.cookie("rv_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: publicUrl.startsWith("https:"),
      maxAge: 10 * 60000,
      path: "/api/auth/google",
    });
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: `${publicUrl}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });
  app.get("/api/auth/google/callback", async (req, res) => {
    if (!googleEnabled) fail("Google sign-in has not been configured.", 503);
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const bound = cookies(req.headers.cookie).rv_oauth_state;
    const stateRecord = state ? oauthStates.get(tokenHash(state)) : null;
    res.clearCookie("rv_oauth_state", { path: "/api/auth/google" });
    if (
      !state ||
      state !== bound ||
      !stateRecord ||
      stateRecord.expires < Date.now()
    )
      fail("Google sign-in expired. Please start again.", 403);
    oauthStates.delete(tokenHash(state));
    if (req.query.error)
      return res.redirect("/?authError=Google%20sign-in%20was%20cancelled");
    const code = text(req.query.code, 4096, 1);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: `${publicUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok)
      fail("Google could not finish sign-in. Please try again.", 502);
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!profileResponse.ok)
      fail("Could not retrieve your Google profile.", 502);
    const profile = await profileResponse.json();
    if (profile.email_verified !== true || !profile.sub || !profile.email)
      fail("A verified Google email is required.", 403);
    let account = db
      .prepare("SELECT * FROM accounts WHERE google_sub=? OR email=?")
      .get(profile.sub, profile.email.toLowerCase());
    let user;
    if (account) {
      if (account.google_sub && account.google_sub !== profile.sub)
        fail("This account is linked to another Google identity.", 403);
      if (!account.google_sub) {
        const linkedSession = stateRecord.sessionHash
          ? db
              .prepare(
                "SELECT user_id,expires FROM auth_sessions WHERE token=?",
              )
              .get(stateRecord.sessionHash)
          : null;
        if (
          stateRecord.userId !== account.user_id ||
          linkedSession?.user_id !== account.user_id ||
          linkedSession.expires <= Date.now()
        )
          fail(
            "An email/password account already uses this email. Sign in with its password, then connect Google from your profile.",
            409,
          );
      }
      db.prepare("UPDATE accounts SET google_sub=? WHERE user_id=?").run(
        profile.sub,
        account.user_id,
      );
      user = getUser(account.user_id);
    } else {
      let handle =
        String(profile.email.split("@")[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 18) || "roomie";
      if (handle.length < 3) handle = `${handle}room`;
      if (store.all("user").some((u) => u.handle === handle))
        handle += randomBytes(3).toString("hex");
      user = {
        id: id("user_"),
        handle,
        name: String(profile.name || handle).slice(0, 60),
        bio: "",
        avatar: avatar(),
        verified: false,
        role: "user",
        verification: "NOT_APPLIED",
        presence: "open",
        settings: defaults(),
        needsConsent: true,
        createdAt: now(),
      };
      store.put("user", user);
      db.prepare("INSERT INTO accounts VALUES(?,?,NULL,?)").run(
        user.id,
        profile.email.toLowerCase(),
        profile.sub,
      );
      addHome(store, user);
    }
    issueSession(res, user.id);
    res.redirect("/");
  });
  app.get("/api/bootstrap", requireAuth, (req, res) => {
    res.json(bootstrap(req.user));
  });
  app.get("/api/resources/:id", requireAuth, (req, res) => {
    cleanup();
    const resource = entity(req.params.id, "resource"),
      grant = readGrant(req.user.id, resource);
    if (!grant || (grant.scope === "once" && grant.used))
      fail("This tool is private. Request permission from its owner.", 403);
    if (grant.scope === "once") grant.used = true;
    res.json({
      resource: { ...resource, ownerId: undefined },
      scope: grant.scope,
    });
  });

  function validateObjects(objects) {
    if (!Array.isArray(objects) || objects.length > 40)
      fail("A room can contain up to 40 objects.");
    return objects.map((object) => {
      if (!object || typeof object !== "object" || Array.isArray(object))
        fail("Each room object must have a valid shape.");
      const x = Number(object.x),
        y = Number(object.y),
        rotation = Number(object.rotation ?? 0);
      if (
        !Number.isFinite(x) ||
        x < 0 ||
        x > 100 ||
        !Number.isFinite(y) ||
        y < 0 ||
        y > 100 ||
        !Number.isFinite(rotation)
      )
        fail("Room coordinates must be between 0 and 100.");
      return {
        id:
          typeof object.id === "string" ? text(object.id, 100, 1) : id("obj_"),
        type: pick(
          object.type,
          [
            "sofa",
            "plant",
            "rug",
            "desk",
            "lamp",
            "art",
            "shelf",
            "chair",
            "table",
            "bed",
            "cushion",
            "window",
            "tv",
          ],
          "room object",
        ),
        x,
        y,
        rotation: ((rotation % 360) + 360) % 360,
        color: /^#[0-9a-f]{3,8}$/i.test(object.color || "")
          ? object.color
          : "#b7c6ad",
      };
    });
  }
  function updateRoom(room, payload) {
    if (Number(payload.version) !== room.version)
      fail("Your room changed. Refresh before applying this edit.", 409);
    const snapshot = { theme: room.theme, objects: room.objects };
    if (payload.theme !== undefined)
      room.theme = pick(payload.theme, THEMES, "room theme");
    if (payload.objects !== undefined)
      room.objects = validateObjects(payload.objects);
    room.history = [...room.history, snapshot].slice(-15);
    room.version++;
    store.put("room", room, room.ownerId);
    return room;
  }
  function validateTranslations(input) {
    if (!input) return {};
    if (
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length > 20
    )
      fail("Provide up to 20 translated descriptions.");
    return Object.fromEntries(
      Object.entries(input).map(([locale, value]) => {
        if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(locale))
          fail("Use a valid language code.");
        return [locale, text(value, 3000)];
      }),
    );
  }
  function validateContent(type, content) {
    if (type === "whiteboard")
      return { text: text(content?.text ?? "", 20000) };
    if (!Array.isArray(content) || content.length > 500)
      fail("This tool supports up to 500 entries.");
    return content.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        fail("Each tool entry must have a valid shape.");
      const itemId =
        typeof item.id === "string" ? text(item.id, 100, 1) : id("item_");
      if (type === "tasks")
        return { id: itemId, text: text(item.text, 500, 1), done: !!item.done };
      if (type === "journal")
        return {
          id: itemId,
          title: text(item.title ?? "", 150),
          text: text(item.text ?? "", 20000),
          date: text(item.date ?? now().slice(0, 10), 40),
        };
      if (type === "planner")
        return {
          id: itemId,
          title: text(item.title, 200, 1),
          date: text(item.date, 40, 1),
        };
      return {
        id: itemId,
        title: text(item.title, 200, 1),
        url: url(item.url),
      };
    });
  }
  function checkedHall(hallId, user, owner = false) {
    const hall = entity(hallId, "hall");
    if (owner && hall.ownerId !== user.id && user.role !== "admin")
      fail("Only the creator can change this hall.", 403);
    if (!owner && !canReadHall(user.id, hall))
      fail(
        "This hall requires creator access, a follow, or a granted ticket.",
        403,
      );
    return hall;
  }
  function checkedHost(user) {
    const session = sessionFor(user.id);
    if (!session || session.hostId !== user.id)
      fail("Only the room host can do that.", 403);
    return session;
  }

  const actions = {};
  actions["profile.complete"] = (user, p) => {
    if (
      !Number.isFinite(Number(p.age)) ||
      Number(p.age) < 18 ||
      Number(p.age) > 120 ||
      p.consent !== true
    )
      fail(
        "Confirm that you are 18 or older and accept the community and privacy terms.",
      );
    user.needsConsent = false;
    store.put("user", user);
    return { ok: true };
  };
  actions["profile.update"] = (user, p) => {
    if (p.name !== undefined) user.name = text(p.name, 60, 1);
    if (p.bio !== undefined) user.bio = text(p.bio, 300);
    if (p.presence !== undefined)
      user.presence = pick(
        p.presence,
        ["open", "focused", "away", "private", "available", "busy"],
        "presence",
      );
    if (p.avatar) {
      const a = p.avatar;
      user.avatar = {
        skin: /^#[0-9a-f]{3,8}$/i.test(a.skin) ? a.skin : user.avatar.skin,
        hair: /^#[0-9a-f]{3,8}$/i.test(a.hair) ? a.hair : user.avatar.hair,
        outfit: /^#[0-9a-f]{3,8}$/i.test(a.outfit)
          ? a.outfit
          : user.avatar.outfit,
        hairStyle: pick(
          a.hairStyle ?? user.avatar.hairStyle,
          [
            "waves",
            "crop",
            "bob",
            "curls",
            "braids",
            "long",
            "short",
            "bun",
            "fade",
            "afro",
          ],
          "hair style",
        ),
        accessory: pick(
          a.accessory ?? user.avatar.accessory,
          ["none", "glasses", "earrings", "cap", "headphones", "beanie"],
          "accessory",
        ),
      };
    }
    store.put("user", user);
    refreshAll();
    return { ok: true };
  };
  actions["settings.update"] = (user, p) => {
    if (!p.settings || typeof p.settings !== "object")
      fail("Settings are required.");
    for (const [key, value] of Object.entries(p.settings)) {
      if (key === "knocks")
        user.settings[key] = pick(
          value,
          ["everyone", "followers", "nobody"],
          "knock setting",
        );
      else if (key in defaults()) user.settings[key] = flag(value);
    }
    store.put("user", user);
    refreshAll();
    return { ok: true };
  };
  actions["follow.toggle"] = (user, p) => {
    getUser(p.userId);
    if (p.userId === user.id || blocked(user.id, p.userId))
      fail("This person cannot be followed.", 403);
    if (store.has("follow", user.id, p.userId))
      store.unlink("follow", user.id, p.userId);
    else {
      store.link("follow", user.id, p.userId);
      notify(p.userId, "A new connection", `${user.name} is following you.`);
    }
    refreshAll();
    return { ok: true };
  };
  actions["closefriend.toggle"] = (user, p) => {
    getUser(p.userId);
    if (user.id === p.userId || blocked(user.id, p.userId))
      fail("This person cannot be added.", 403);
    if (store.has("closeFriend", user.id, p.userId))
      store.unlink("closeFriend", user.id, p.userId);
    else store.link("closeFriend", user.id, p.userId);
    refreshAll();
    return { ok: true };
  };
  actions["contacts.match"] = (user, p) => {
    if (!user.settings.contactSync)
      fail("Enable contact matching before importing contacts.", 403);
    rate(`contacts:${user.id}`, 5, 60000);
    if (!Array.isArray(p.emails) || p.emails.length > 500)
      fail("Import up to 500 email addresses at a time.");
    const emails = [
      ...new Set(
        p.emails.map((value) => {
          const email = text(value, 254, 3).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            fail("One of the contact email addresses is invalid.");
          return email;
        }),
      ),
    ];
    const matches = [];
    for (const email of emails) {
      const account = db
        .prepare("SELECT user_id FROM accounts WHERE email=?")
        .get(email);
      if (!account || account.user_id === user.id) continue;
      const contact = getUser(account.user_id);
      if (
        !contact.settings.discoverable ||
        !contact.settings.contactSync ||
        blocked(user.id, contact.id)
      )
        continue;
      matches.push({
        ...safeUser(contact),
        following: store.has("follow", user.id, contact.id),
        followers: store.count("follow", contact.id),
        blocked: false,
      });
    }
    return { matches };
  };
  actions["contacts.clear"] = (user) => {
    user.settings.contactSync = false;
    store.put("user", user);
    return { ok: true };
  };
  actions["block.toggle"] = (user, p) => {
    getUser(p.userId);
    if (user.id === p.userId) fail("You cannot block yourself.");
    if (store.has("block", user.id, p.userId))
      store.unlink("block", user.id, p.userId);
    else {
      store.link("block", user.id, p.userId);
      store.unlink("follow", user.id, p.userId);
      store.unlink("follow", p.userId, user.id);
      store.unlink("closeFriend", user.id, p.userId);
      store.unlink("closeFriend", p.userId, user.id);
      const a = sessionFor(user.id),
        b = sessionFor(p.userId);
      if (a && a === b) {
        if (a.hostId === user.id) leaveSession(p.userId);
        else leaveSession(user.id);
      }
      for (const r of store.all("request"))
        if (
          ((r.fromId === user.id && r.toId === p.userId) ||
            (r.toId === user.id && r.fromId === p.userId)) &&
          ["pending", "accepted"].includes(r.status)
        ) {
          r.status = "cancelled";
          store.put("request", r, r.toId);
        }
    }
    refreshAll();
    return { ok: true };
  };
  actions["notifications.read"] = (user, p) => {
    for (const notice of store.all("notification", user.id)) {
      if (!p.notificationId || notice.id === p.notificationId) {
        notice.read = true;
        store.put("notification", notice, user.id);
      }
    }
    return { ok: true };
  };
  actions["room.update"] = (user, p) => {
    const room = p.roomId ? entity(p.roomId, "room") : ownRoom(user.id);
    if (room.ownerId !== user.id) {
      const session = sessionFor(user.id),
        participant = session?.participants.find((x) => x.userId === user.id);
      if (session?.roomId !== room.id || !participant?.permissions.interact)
        fail("The host has not enabled room interaction.", 403);
    }
    const updated = updateRoom(room, p);
    refresh(
      sessionFor(room.ownerId)?.participants.map((p) => p.userId) || [
        room.ownerId,
      ],
    );
    return { ok: true, version: updated.version };
  };
  actions["room.undo"] = (user) => {
    const room = ownRoom(user.id),
      previous = room.history.pop();
    if (!previous) fail("There is no room change to undo.");
    room.theme = previous.theme;
    room.objects = previous.objects;
    room.version++;
    store.put("room", room, user.id);
    refresh(
      sessionFor(user.id)?.participants.map((p) => p.userId) || [user.id],
    );
    return { ok: true, version: room.version };
  };
  actions["roomie.preview"] = async (user, p) => {
    const prompt = text(p.prompt, 600, 3),
      lower = prompt.toLowerCase(),
      room = ownRoom(user.id);
    let theme = room.theme;
    if (/lavender|purple|dream/.test(lower)) theme = "lavender";
    else if (/dark|midnight|night|blue/.test(lower)) theme = "midnight";
    else if (/warm|clay|sunset|orange|cozy|cosy/.test(lower)) theme = "clay";
    else if (/green|sage|natural|calm/.test(lower)) theme = "sage";
    let objects = structuredClone(room.objects),
      action = "room",
      resourceType;
    const types = [
      "plant",
      "lamp",
      "desk",
      "sofa",
      "shelf",
      "chair",
      "table",
      "bed",
      "art",
      "rug",
    ];
    for (const type of types)
      if (new RegExp(`\\b${type}s?\\b`).test(lower)) {
        if (/remove|delete/.test(lower))
          objects = objects.filter((o) => o.type !== type);
        else if (
          !objects.some((o) => o.type === type) ||
          /\b(more|another|extra|add)\b/.test(lower)
        )
          objects.push({
            id: id("obj_"),
            type,
            x: 25 + ((objects.length * 7) % 55),
            y: 45 + ((objects.length * 5) % 40),
            rotation: 0,
            color: "#a3b49c",
          });
      }
    let tasks = /task|to.do|remind/.test(lower)
      ? [
          {
            id: id("task_"),
            text: prompt
              .replace(
                /^(add|create|make)\s+(a\s+)?(task|to.do|reminder)\s*[:\-]?\s*/i,
                "",
              )
              .slice(0, 500),
            done: false,
          },
        ]
      : undefined;
    if (tasks) action = "tasks";
    let message = tasks
      ? "Add this task to your private list."
      : `Apply a ${theme} palette${objects.length !== room.objects.length ? " and the requested furniture change" : ""}. You can undo this room edit.`;
    if (!tasks) {
      if (/movie|host|hang.?out|hang out/.test(lower)) {
        action = "host";
        message =
          "Start a movie-night visit in your room. Invite friends and enable screen sharing only with their consent.";
      } else if (/journal|diary/.test(lower)) resourceType = "journal";
      else if (/memor(y|ies)|photo.?album/.test(lower))
        resourceType = "memories";
      else if (/\b(planner|calendar|plan|schedule|interview)\b/.test(lower))
        resourceType = "planner";
      else if (/whiteboard|brainstorm|idea wall/.test(lower))
        resourceType = "whiteboard";
      if (resourceType) {
        action = "open_resource";
        message = `Open your private ${resourceType}. Nothing will be shared with visitors.`;
      }
    }
    if (/cozy|cosy/.test(lower) && action === "room") {
      objects = objects.map((object) =>
        object.type === "sofa"
          ? { ...object, color: "#b9785d" }
          : object.type === "lamp"
            ? { ...object, color: "#e3c393" }
            : object,
      );
      for (const type of ["plant", "lamp"])
        if (!objects.some((o) => o.type === type))
          objects.push({
            id: id("obj_"),
            type,
            x: type === "plant" ? 76 : 27,
            y: type === "plant" ? 52 : 49,
            rotation: 0,
            color: type === "plant" ? "#718f68" : "#e3c393",
          });
      message =
        "Apply a warm clay palette with a soft lamp, a plant, and a terracotta sofa. You can undo this edit.";
    }
    if (roomieApiKey) {
      rate(`roomie:${user.id}`, 12, 60000);
      if (!roomieApiUrl.startsWith("https://"))
        fail("The Roomie provider URL must use HTTPS.", 503);
      let output;
      try {
        const response = await fetch(roomieApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${roomieApiKey}`,
          },
          body: JSON.stringify({
            model: roomieModel,
            max_tokens: 2000,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You propose reversible edits in a 2D room. Return only JSON with theme (sage,clay,midnight,lavender), objects (complete list, max40; id,type,x,y,rotation,color), message (plain explanation), action (room,tasks,open_resource,host), tasks (optional array id,text,done), resourceType (required only for open_resource: tasks,journal,planner,memories,whiteboard). Objects types: sofa,plant,rug,desk,lamp,art,shelf,chair,table,bed,cushion,window,tv. x and y percentages0..100; color hex. You may propose room appearance, create personal tasks, open an owner-private tool, or start hosting without inviting anybody. Never read or share private tools. Never pretend to perform an action; the user will approve the preview. No journal or other private tool data is available.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  request: prompt,
                  currentRoom: { theme: room.theme, objects: room.objects },
                }),
              },
            ],
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
          fail(
            "Roomie’s configured provider is unavailable. Check its credentials and network settings.",
            502,
          );
        const data = await response.json();
        output = JSON.parse(data.choices?.[0]?.message?.content ?? "");
      } catch (error) {
        if (error.status) throw error;
        fail(
          "Roomie’s provider did not return a usable proposal. Try again shortly.",
          502,
        );
      }
      theme = pick(output.theme ?? room.theme, THEMES, "proposed theme");
      objects = validateObjects(output.objects ?? room.objects);
      action = pick(
        output.action ?? "room",
        ["room", "tasks", "open_resource", "host"],
        "proposed action",
      );
      tasks =
        action === "tasks"
          ? validateContent("tasks", output.tasks ?? [])
          : undefined;
      resourceType =
        action === "open_resource"
          ? pick(output.resourceType, RESOURCE_TYPES, "private tool")
          : undefined;
      if (action === "tasks" && !tasks.length)
        fail(
          "Roomie did not propose a task. Try a more specific request.",
          502,
        );
      message = text(
        output.message ?? "Review this proposed change before applying it.",
        1000,
        1,
      );
    }
    objects = validateObjects(objects);
    const proposal = {
      id: id("proposal_"),
      theme,
      objects,
      message,
      action,
      tasks,
      resourceType,
      mode: roomieMode,
      prompt,
    };
    proposals.set(proposal.id, {
      userId: user.id,
      proposal,
      expires: Date.now() + 10 * 60000,
    });
    return { proposal, mode: roomieMode };
  };
  actions["roomie.apply"] = (user, p) => {
    const stored = proposals.get(p.proposal?.id);
    if (!stored || stored.userId !== user.id || stored.expires < Date.now())
      fail("This preview has expired. Ask Roomie for a new preview.", 409);
    const proposal = stored.proposal;
    const room = ownRoom(user.id);
    if (Number(p.version) !== room.version)
      fail("Your room changed. Request a fresh preview.", 409);
    if (proposal.action === "tasks") {
      const tasks = store
        .all("resource", user.id)
        .find((r) => r.type === "tasks");
      tasks.content = validateContent("tasks", [
        ...tasks.content,
        ...proposal.tasks,
      ]);
      store.put("resource", tasks, user.id);
    } else if (proposal.action === "host") hostSession(user.id);
    else if (proposal.action === "room")
      updateRoom(room, {
        version: p.version,
        theme: proposal.theme,
        objects: proposal.objects,
      });
    proposals.delete(proposal.id);
    store.put(
      "roomieLog",
      {
        id: id("log_"),
        userId: user.id,
        prompt: proposal.prompt,
        message: proposal.message,
        mode: proposal.mode,
        createdAt: now(),
      },
      user.id,
    );
    refresh(
      sessionFor(user.id)?.participants.map((p) => p.userId) || [user.id],
    );
    return {
      ok: true,
      ...(proposal.action === "open_resource"
        ? { navigate: "tools", resourceType: proposal.resourceType }
        : proposal.action === "host"
          ? { navigate: "visits" }
          : {}),
    };
  };
  actions["resource.save"] = (user, p) => {
    const resource = entity(p.resourceId, "resource"),
      grant = readGrant(user.id, resource);
    if (!grant || grant.scope !== "write")
      fail("You do not have editing permission for this tool.", 403);
    resource.content = validateContent(resource.type, p.content);
    if (resource.type === "memories")
      for (const memory of resource.content)
        if (memory.url?.startsWith("/media/")) {
          const upload = store.all("upload").find((u) => u.url === memory.url);
          if (!upload || ![user.id, resource.ownerId].includes(upload.ownerId))
            fail("Memory photos must be your own uploads.", 403);
        }
    store.put("resource", resource, resource.ownerId);
    refresh([
      resource.ownerId,
      ...(sessionFor(user.id)?.participants.map((p) => p.userId) || []),
    ]);
    return { ok: true };
  };
  actions["resource.request"] = (user, p) => {
    const resource = entity(p.resourceId, "resource"),
      session = sessionFor(user.id);
    if (
      !session ||
      session.hostId !== resource.ownerId ||
      user.id === resource.ownerId
    )
      fail("Join the owner’s room before requesting a tool.", 403);
    if (
      store
        .all("request")
        .some(
          (r) =>
            r.fromId === user.id &&
            r.resourceId === resource.id &&
            r.status === "pending",
        )
    )
      fail("You already have a pending request for this tool.", 409);
    const scope = pick(
      p.scope ?? "read",
      ["once", "read", "write"],
      "access scope",
    );
    const request = {
      id: id("request_"),
      fromId: user.id,
      toId: resource.ownerId,
      type: "access",
      reason: `Access to ${resource.title}`,
      status: "pending",
      roomId: session.roomId,
      resourceId: resource.id,
      scope,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
    store.put("request", request, request.toId);
    notify(
      request.toId,
      "Tool access request",
      `${user.name} requested ${scope} access to ${resource.title}.`,
    );
    return { ok: true, request };
  };
  actions["resource.grant"] = (user, p) => {
    const request = entity(p.requestId, "request");
    if (
      request.type !== "access" ||
      request.toId !== user.id ||
      request.status !== "pending"
    )
      fail("This access request cannot be changed.", 403);
    const scope = pick(
      p.scope,
      ["once", "read", "write", "deny"],
      "access scope",
    );
    const session = checkedHost(user);
    if (
      session.roomId !== request.roomId ||
      !session.participants.some((x) => x.userId === request.fromId)
    )
      fail("This visitor is no longer in your room.", 409);
    const resource = entity(request.resourceId, "resource");
    if (resource.ownerId !== user.id)
      fail("Only the owner can grant access.", 403);
    request.status = scope === "deny" ? "declined" : "accepted";
    request.scope = scope;
    store.put("request", request, user.id);
    session.grants = session.grants.filter(
      (g) => !(g.resourceId === resource.id && g.userId === request.fromId),
    );
    if (scope !== "deny")
      session.grants.push({
        resourceId: resource.id,
        userId: request.fromId,
        scope,
        used: false,
        expiresAt: Date.now() + 30 * 60000,
      });
    notify(
      request.fromId,
      scope === "deny" ? "Tool request declined" : "Tool access granted",
      `${user.name} ${scope === "deny" ? "declined your request" : `granted ${scope} access to ${resource.title}`}.`,
    );
    refresh([user.id, request.fromId]);
    return { ok: true };
  };
  actions["resource.revoke"] = (user, p) => {
    const resource = entity(p.resourceId, "resource");
    if (resource.ownerId !== user.id)
      fail("Only the owner can revoke access.", 403);
    const session = sessionFor(user.id);
    if (session) {
      session.grants = session.grants.filter(
        (g) => !(g.resourceId === resource.id && g.userId === p.userId),
      );
      io.to(`user:${p.userId}`).emit("resources:revoked", {
        resourceIds: [resource.id],
      });
      refresh([user.id, p.userId]);
    }
    return { ok: true };
  };
  actions["resource.close"] = (user, p) => {
    const session = sessionFor(user.id);
    if (session) {
      session.grants = session.grants.filter(
        (g) =>
          !(
            g.resourceId === p.resourceId &&
            g.userId === user.id &&
            g.scope === "once"
          ),
      );
      refresh([user.id, session.hostId]);
    }
    return { ok: true };
  };

  actions["post.create"] = (user, p) => {
    const mediaType = pick(
        p.mediaType ?? "postcard",
        ["postcard", "photo", "video"],
        "post type",
      ),
      mediaUrl = url(p.mediaUrl);
    if (mediaType !== "postcard" && !mediaUrl)
      fail("Upload media before publishing this post.");
    if (mediaUrl?.startsWith("/media/")) {
      const upload = store.all("upload").find((u) => u.url === mediaUrl);
      if (!upload || upload.ownerId !== user.id)
        fail("Choose one of your own uploads.", 403);
      if (
        (mediaType === "video" && !upload.mime.startsWith("video/")) ||
        (mediaType === "photo" && !upload.mime.startsWith("image/"))
      )
        fail("The upload does not match this post type.");
    }
    const post = {
      id: id("post_"),
      authorId: user.id,
      caption: text(p.caption ?? "", 1200, 1),
      variant: pick(p.variant ?? "sunset", VARIANTS, "postcard style"),
      mediaUrl,
      mediaType,
      visibility: pick(
        p.visibility ?? "public",
        ["public", "followers", "close-friends"],
        "visibility",
      ),
      createdAt: now(),
    };
    store.put("post", post, user.id);
    refreshAll();
    return { ok: true, post };
  };
  actions["post.like"] = (user, p) => {
    const post = entity(p.postId, "post");
    if (!canReadPost(user.id, post)) fail("This post is unavailable.", 403);
    if (store.has("like", user.id, post.id))
      store.unlink("like", user.id, post.id);
    else store.link("like", user.id, post.id);
    refreshAll();
    return { ok: true };
  };
  actions["post.save"] = (user, p) => {
    const post = entity(p.postId, "post");
    if (!canReadPost(user.id, post)) fail("This post is unavailable.", 403);
    if (store.has("postSave", user.id, post.id))
      store.unlink("postSave", user.id, post.id);
    else store.link("postSave", user.id, post.id);
    return { ok: true };
  };
  actions["post.delete"] = (user, p) => {
    const post = entity(p.postId, "post");
    if (post.authorId !== user.id && user.role !== "admin")
      fail("Only the author can delete this post.", 403);
    store.remove(post.id);
    db.prepare("DELETE FROM relations WHERE to_id=?").run(post.id);
    refreshAll();
    return { ok: true };
  };
  actions["post.hide"] = (user, p) => {
    entity(p.postId, "post");
    store.link("hidePost", user.id, p.postId);
    return { ok: true };
  };
  function createVisit(user, p, type) {
    const other = getUser(p.userId);
    if (user.id === other.id || blocked(user.id, other.id))
      fail("This person cannot be contacted.", 403);
    if (other.needsConsent) fail("This account is not ready for visits.", 403);
    const current = sessionFor(user.id);
    let host = type === "knock" ? other : user,
      guest = type === "knock" ? user : other,
      hostCurrent;
    if (type === "invite" && current && current.hostId !== user.id) {
      const member = current.participants.find((p) => p.userId === user.id);
      if (!member?.permissions.invite)
        fail("The host has not enabled inviting for you.", 403);
      host = getUser(current.hostId);
      hostCurrent = current;
      if (other.id === host.id || blocked(other.id, host.id))
        fail("This person cannot be invited to the host’s room.", 403);
    }
    if (
      type === "knock" &&
      (host.settings.knocks === "nobody" ||
        (host.settings.knocks === "followers" &&
          !store.has("follow", guest.id, host.id)))
    )
      fail("This person is not accepting knocks from you.", 403);
    if (
      store
        .all("request")
        .some(
          (r) =>
            r.fromId === user.id &&
            r.toId === other.id &&
            r.type === type &&
            r.status === "pending",
        )
    )
      fail("You already have a pending request.", 409);
    const room = ownRoom(host.id);
    if (type === "invite") hostCurrent ??= hostSession(user.id);
    const request = {
      id: id("request_"),
      fromId: user.id,
      toId: other.id,
      hostId: host.id,
      type,
      reason:
        type === "knock"
          ? pick(
              p.reason ?? "Hang out?",
              ["Hang out?", "Can we talk?", "Create together?"],
              "knock reason",
            )
          : "You’re invited",
      status: "pending",
      roomId: room.id,
      sessionId: hostCurrent?.id,
      resourceId: null,
      scope: null,
      permissions:
        type === "invite"
          ? permissions(
              host.id === user.id
                ? (p.permissions ?? { chat: true })
                : { chat: true },
            )
          : undefined,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
    store.put("request", request, other.id);
    notify(
      other.id,
      type === "knock" ? "A knock at your door" : "A room invitation",
      `${user.name} ${type === "knock" ? request.reason.toLowerCase() : "invited you to visit their room."}`,
    );
    if (host.id !== user.id && type === "invite")
      notify(
        host.id,
        "A guest sent an invitation",
        `${user.name} invited ${other.name} with chat permission.`,
      );
    refresh([user.id]);
    return { ok: true, request };
  }
  actions["knock.create"] = (user, p) => createVisit(user, p, "knock");
  actions["invite.create"] = (user, p) => createVisit(user, p, "invite");
  actions["request.respond"] = (user, p) => {
    const request = entity(p.requestId, "request");
    if (
      request.toId !== user.id ||
      request.status !== "pending" ||
      request.type === "access"
    )
      fail("This request cannot be changed.", 403);
    if (blocked(request.fromId, request.toId))
      fail("This person cannot be contacted.", 403);
    const accept = flag(p.accept);
    if (accept) {
      const hostId =
        request.hostId ??
        (request.type === "knock" ? request.toId : request.fromId);
      const host = getUser(hostId);
      if (host.needsConsent) fail("The host account is not ready.", 403);
      let session;
      if (request.type === "invite") {
        session = sessionFor(hostId);
        if (
          !session ||
          session.hostId !== hostId ||
          session.id !== request.sessionId
        )
          fail("The host has ended this invitation.", 409);
      } else session = hostSession(hostId);
      request.permissions =
        request.type === "knock"
          ? permissions(p.permissions ?? { chat: true })
          : permissions(request.permissions ?? { chat: true });
      request.sessionId = session.id;
      request.status = "accepted";
      request.expiresAt = new Date(Date.now() + 3600000).toISOString();
      notify(
        request.fromId,
        "Visit request accepted",
        `${user.name} accepted. The visitor can join when ready.`,
      );
    } else {
      request.status = "declined";
      notify(
        request.fromId,
        "Visit request declined",
        `${user.name} declined this visit request.`,
      );
    }
    store.put("request", request, request.toId);
    refresh([request.fromId, request.toId]);
    return { ok: true, request };
  };
  actions["request.cancel"] = (user, p) => {
    const request = entity(p.requestId, "request");
    if (
      request.fromId !== user.id ||
      !["pending", "accepted"].includes(request.status)
    )
      fail("This request cannot be cancelled.", 403);
    request.status = "cancelled";
    store.put("request", request, request.toId);
    const guestId = request.type === "knock" ? request.fromId : request.toId;
    if (sessionFor(guestId)?.roomId === request.roomId) leaveSession(guestId);
    refresh([request.fromId, request.toId]);
    return { ok: true };
  };
  actions["session.start"] = (user) => {
    const session = hostSession(user.id);
    refresh([user.id]);
    return { ok: true, sessionId: session.id };
  };
  actions["session.join"] = (user, p) => {
    const request = entity(p.requestId, "request");
    if (
      request.status !== "accepted" ||
      request.type === "access" ||
      Date.parse(request.expiresAt) <= Date.now()
    )
      fail("This invitation has expired or was not accepted.", 403);
    const guestId = request.type === "knock" ? request.fromId : request.toId,
      hostId =
        request.hostId ??
        (request.type === "knock" ? request.toId : request.fromId);
    if (user.id !== guestId || blocked(user.id, hostId))
      fail("This invitation belongs to another visitor.", 403);
    const hostCurrent = sessionFor(hostId);
    if (
      !hostCurrent ||
      hostCurrent.hostId !== hostId ||
      hostCurrent.id !== request.sessionId
    )
      fail("The host has ended this room session.", 409);
    const previous = sessionFor(user.id);
    if (previous && previous.id !== hostCurrent.id)
      fail("Leave your current room session before joining another.", 409);
    if (
      hostCurrent.participants.length >= 50 &&
      !hostCurrent.participants.some((p) => p.userId === user.id)
    )
      fail("This room has reached its 50-person limit.", 409);
    if (!hostCurrent.participants.some((p) => p.userId === user.id))
      hostCurrent.participants.push({
        userId: user.id,
        permissions: permissions(request.permissions ?? { chat: true }),
        joinedAt: now(),
      });
    memberships.set(user.id, hostCurrent.id);
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === user.id)
        socket.join(`session:${hostCurrent.id}`);
    refresh(hostCurrent.participants.map((p) => p.userId));
    return { ok: true, sessionId: hostCurrent.id };
  };
  actions["session.leave"] = (user) => {
    leaveSession(user.id);
    return { ok: true };
  };
  actions["session.end"] = (user) => {
    endSession(checkedHost(user));
    return { ok: true };
  };
  actions["session.remove"] = (user, p) => {
    const session = checkedHost(user);
    if (
      p.userId === user.id ||
      !session.participants.some((x) => x.userId === p.userId)
    )
      fail("Choose an admitted visitor to remove.");
    for (const r of store.all("request"))
      if (
        r.roomId === session.roomId &&
        r.status === "accepted" &&
        ((r.type === "knock" && r.fromId === p.userId) ||
          (r.type === "invite" && r.toId === p.userId))
      ) {
        r.status = "cancelled";
        store.put("request", r, r.toId);
      }
    leaveSession(p.userId);
    return { ok: true };
  };
  actions["session.permissions"] = (user, p) => {
    const session = checkedHost(user),
      guest = session.participants.find(
        (x) => x.userId === p.userId && x.userId !== user.id,
      );
    if (!guest) fail("Visitor not found.", 404);
    guest.permissions = permissions(p.permissions);
    if (!guest.permissions.voice && !guest.permissions.screen)
      removeCallPeer(session, guest.userId);
    io.to(`user:${guest.userId}`).emit("session:permissions", {
      permissions: guest.permissions,
    });
    refresh(session.participants.map((p) => p.userId));
    return { ok: true };
  };

  actions["hall.save"] = (user, p) => {
    const input = p.hall;
    if (!input || typeof input !== "object") fail("A hall is required.");
    const old = input.id ? checkedHall(input.id, user, true) : null;
    if (old && old.ownerId !== user.id && user.role !== "admin")
      fail("Only the creator can edit this hall.", 403);
    if (!Array.isArray(input.artworks) || input.artworks.length > 60)
      fail("A hall can contain up to 60 artworks.");
    const artworks = input.artworks.map((art) => {
      if (!art || typeof art !== "object" || Array.isArray(art))
        fail("Each artwork must have a valid shape.");
      const artUrl = url(art.url);
      if (artUrl?.startsWith("/media/")) {
        const upload = store.all("upload").find((u) => u.url === artUrl);
        if (
          !upload ||
          upload.ownerId !== user.id ||
          !upload.mime.startsWith("image/")
        )
          fail("Choose one of your own image uploads.", 403);
      }
      if (artUrl && !art.rightsConfirmed)
        fail("Confirm your rights to display uploaded artwork.");
      const price =
        art.price === null || art.price === "" || art.price === undefined
          ? null
          : Number(art.price);
      if (
        price !== null &&
        (!Number.isFinite(price) || price < 0 || price > 10000000)
      )
        fail("Enter a valid artwork price.");
      return {
        id: typeof art.id === "string" ? text(art.id, 100, 1) : id("art_"),
        title: text(art.title, 150, 1),
        description: text(art.description ?? "", 3000),
        medium: text(art.medium ?? "Digital art", 120),
        year: Number.isFinite(Number(art.year))
          ? Number(art.year)
          : new Date().getFullYear(),
        variant: pick(art.variant ?? "sunset", VARIANTS, "art style"),
        url: artUrl,
        alt: text(art.alt ?? art.title, 500),
        price,
        purchaseUrl: url(art.purchaseUrl),
        audioApproved: art.audioApproved === true,
        rightsConfirmed: art.rightsConfirmed === true,
        saleStatus: pick(
          art.saleStatus ?? "not-for-sale",
          ["not-for-sale", "available", "sold"],
          "sale status",
        ),
        translations: validateTranslations(art.translations),
      };
    });
    const hall = {
      id: old?.id ?? id("hall_"),
      ownerId: old?.ownerId ?? user.id,
      title: text(input.title, 100, 1),
      description: text(input.description ?? "", 1000),
      cover: pick(input.cover ?? "sunset", VARIANTS, "hall cover"),
      theme: pick(input.theme ?? "sage", THEMES, "hall theme"),
      layout: pick(
        input.layout ?? old?.layout ?? "editorial",
        ["editorial", "balanced", "salon"],
        "hall layout",
      ),
      frame: pick(
        input.frame ?? old?.frame ?? "ivory",
        ["ivory", "oak", "black"],
        "art frame",
      ),
      lighting: pick(
        input.lighting ?? old?.lighting ?? "soft",
        ["soft", "warm", "bright"],
        "hall lighting",
      ),
      access: pick(
        input.access ?? "public",
        ["public", "followers", "ticket"],
        "hall access",
      ),
      published: old?.published ?? false,
      live: old?.live ?? false,
      questionsEnabled: old?.questionsEnabled ?? true,
      spotlightId: old?.spotlightId ?? null,
      artworks,
      events: old?.events ?? [],
      visitors: old?.visitors ?? 0,
      ticketUserIds: old?.ticketUserIds ?? [],
    };
    if (input.ticketUserIds !== undefined) {
      if (
        !Array.isArray(input.ticketUserIds) ||
        input.ticketUserIds.length > 500
      )
        fail("Up to 500 ticket guests can be granted access.");
      hall.ticketUserIds = input.ticketUserIds.map((x) => getUser(x).id);
    }
    if (hall.published && !user.verified && user.role !== "admin")
      fail("Creator verification is required to edit a published hall.", 403);
    store.put("hall", hall, hall.ownerId);
    refreshAll();
    return { ok: true, hall: hallView(hall, user.id) };
  };
  actions["hall.publish"] = (user, p) => {
    const hall = checkedHall(p.hallId, user, true),
      published = flag(p.published);
    if (published && !user.verified && user.role !== "admin")
      fail("Creator verification is required before publishing a hall.", 403);
    if (published && !hall.artworks.length)
      fail("Add at least one artwork before publishing.");
    hall.published = published;
    if (!published) {
      hall.live = false;
      stopHallBroadcast(hall.id);
    }
    store.put("hall", hall, hall.ownerId);
    refreshAll();
    return { ok: true };
  };
  function enterHall(user, hallId) {
    const hall = checkedHall(hallId, user);
    let entries = hallAttendance.get(hall.id);
    if (!entries) {
      entries = new Map();
      hallAttendance.set(hall.id, entries);
    }
    entries.set(user.id, Date.now());
    if (!store.has("hallVisit", user.id, hall.id)) {
      store.link("hallVisit", user.id, hall.id);
      hall.visitors++;
      store.put("hall", hall, hall.ownerId);
    }
    io.to(`hall:${hall.id}`).emit("hall:attendance", {
      hallId: hall.id,
      attendance: entries.size,
    });
    refreshAll();
    return { ok: true, attendance: entries.size };
  }
  function leaveHall(userId, hallId) {
    hallAttendance.get(hallId)?.delete(userId);
    removeHallViewer(hallId, userId);
    io.to(`hall:${hallId}`).emit("hall:attendance", {
      hallId,
      attendance: hallAttendance.get(hallId)?.size || 0,
    });
    refreshAll();
  }
  actions["hall.enter"] = (user, p) => enterHall(user, p.hallId);
  actions["hall.leave"] = (user, p) => {
    leaveHall(user.id, p.hallId);
    return { ok: true };
  };
  actions["artwork.save"] = (user, p) => {
    const hall = checkedHall(p.hallId, user);
    if (!hall.artworks.some((a) => a.id === p.artworkId))
      fail("Artwork not found.", 404);
    if (store.has("artSave", user.id, p.artworkId))
      store.unlink("artSave", user.id, p.artworkId);
    else store.link("artSave", user.id, p.artworkId);
    refreshAll();
    return { ok: true };
  };
  actions["event.create"] = (user, p) => {
    const hall = checkedHall(p.hallId, user, true);
    if (hall.events.length >= 100)
      fail("This hall has reached its event limit.");
    const date = text(p.date, 40, 1);
    if (!Number.isFinite(Date.parse(date))) fail("Enter a valid event date.");
    const event = {
      id: id("event_"),
      title: text(p.title, 150, 1),
      date,
      rsvps: [],
    };
    hall.events.push(event);
    store.put("hall", hall, hall.ownerId);
    refreshAll();
    return { ok: true, event };
  };
  actions["event.rsvp"] = (user, p) => {
    const hall = checkedHall(p.hallId, user),
      event = hall.events.find((e) => e.id === p.eventId);
    if (!event) fail("Event not found.", 404);
    if (event.rsvps.includes(user.id))
      event.rsvps = event.rsvps.filter((x) => x !== user.id);
    else event.rsvps.push(user.id);
    store.put("hall", hall, hall.ownerId);
    return { ok: true };
  };
  actions["hall.live"] = (user, p) => {
    const hall = checkedHall(p.hallId, user, true),
      live = flag(p.live);
    if (live && (!hall.published || (!user.verified && user.role !== "admin")))
      fail("Publish a verified creator hall before starting a live tour.", 403);
    hall.live = live;
    store.put("hall", hall, hall.ownerId);
    if (!live) stopHallBroadcast(hall.id);
    refreshAll();
    return { ok: true };
  };
  actions["hall.spotlight"] = (user, p) => {
    const hall = checkedHall(p.hallId, user, true);
    if (!hall.artworks.some((a) => a.id === p.artworkId))
      fail("Artwork not found.", 404);
    hall.spotlightId = p.artworkId;
    store.put("hall", hall, hall.ownerId);
    io.to(`hall:${hall.id}`).emit("hall:spotlight", {
      hallId: hall.id,
      artworkId: p.artworkId,
    });
    refreshAll();
    return { ok: true };
  };
  actions["hall.questions"] = (user, p) => {
    const hall = checkedHall(p.hallId, user, true);
    hall.questionsEnabled = flag(p.enabled);
    store.put("hall", hall, hall.ownerId);
    refreshAll();
    return { ok: true };
  };
  actions["hall.question"] = (user, p) => {
    const hall = checkedHall(p.hallId, user);
    if (!hall.live || hall.questionsEnabled === false)
      fail("Questions are closed for this creator tour.", 409);
    rate(`question:${user.id}`, 5, 60000);
    const question = {
      id: id("question_"),
      hallId: hall.id,
      userId: user.id,
      text: text(p.text, 500, 1),
      approved: false,
      createdAt: now(),
    };
    store.put("question", question, user.id);
    notify(
      hall.ownerId,
      "A gallery question",
      `${user.name} sent a question for moderation.`,
    );
    return { ok: true, question };
  };
  actions["hall.moderate"] = (user, p) => {
    const question = entity(p.questionId, "question"),
      hall = checkedHall(question.hallId, user, true);
    question.approved = flag(p.approved);
    question.rejected = !question.approved;
    if (p.answer !== undefined) question.answer = text(p.answer, 1000);
    store.put("question", question, question.userId);
    refreshAll();
    return { ok: true };
  };
  actions["verification.apply"] = (user, p) => {
    if (user.verified) fail("You are already verified.", 409);
    const request = {
      id: id("verification_"),
      userId: user.id,
      name: text(p.name, 100, 1),
      website: url(p.website),
      statement: text(p.statement, 2000, 20),
      status: "pending",
      createdAt: now(),
    };
    for (const old of store.all("verification", user.id))
      if (old.status === "pending")
        fail("Your verification request is already pending.", 409);
    store.put("verification", request, user.id);
    user.verification = "PENDING_REVIEW";
    store.put("user", user);
    for (const admin of store.all("user").filter((u) => u.role === "admin"))
      notify(
        admin.id,
        "Creator verification",
        `${user.name} applied for creator verification.`,
      );
    return { ok: true };
  };
  actions["verification.review"] = (user, p) => {
    if (user.role !== "admin") fail("Administrator access is required.", 403);
    const creator = getUser(p.userId),
      approved = flag(p.approved);
    const requests = store
      .all("verification", creator.id)
      .filter((r) => r.status === "pending");
    if (!requests.length)
      fail("No pending verification request was found.", 404);
    for (const r of requests) {
      r.status = approved ? "approved" : "declined";
      r.reviewedAt = now();
      store.put("verification", r, creator.id);
    }
    creator.verified = approved;
    creator.verification = approved ? "VERIFIED" : "NOT_APPLIED";
    if (approved) creator.role = "creator";
    store.put("user", creator);
    notify(
      creator.id,
      approved
        ? "Creator verification approved"
        : "Verification needs more information",
      approved
        ? "You can now publish your creator hall."
        : "Update your statement and apply again when ready.",
    );
    refreshAll();
    return { ok: true };
  };
  actions["report.create"] = (user, p) => {
    const targetType = pick(
        p.targetType,
        ["user", "post", "hall", "artwork", "room", "question"],
        "report target",
      ),
      targetId = text(p.targetId, 100, 1),
      reason = text(p.reason, 150, 1),
      details = text(p.details ?? "", 2000);
    if (targetType === "user") getUser(targetId);
    else if (targetType === "artwork") {
      if (
        !store
          .all("hall")
          .some((h) => h.artworks.some((a) => a.id === targetId))
      )
        fail("Artwork not found.", 404);
    } else entity(targetId, targetType);
    const report = {
      id: id("report_"),
      userId: user.id,
      targetType,
      targetId,
      reason,
      details,
      status: "pending",
      createdAt: now(),
    };
    store.put("report", report, user.id);
    for (const admin of store.all("user").filter((u) => u.role === "admin"))
      notify(
        admin.id,
        "A safety report needs review",
        `A ${targetType} report was submitted.`,
      );
    return { ok: true, report };
  };
  actions["report.resolve"] = (user, p) => {
    if (user.role !== "admin") fail("Administrator access is required.", 403);
    const report = entity(p.reportId, "report");
    report.status = "resolved";
    report.resolvedAt = now();
    store.put("report", report, report.userId);
    notify(
      report.userId,
      "Your report was reviewed",
      "A moderator reviewed and resolved your report.",
    );
    return { ok: true };
  };
  actions["account.export"] = (user) => {
    const account = db
      .prepare("SELECT email,google_sub FROM accounts WHERE user_id=?")
      .get(user.id);
    return {
      export: {
        exportedAt: now(),
        user: {
          ...safeUser(user),
          settings: user.settings,
          email: account.email,
          googleLinked: !!account.google_sub,
        },
        room: ownRoom(user.id),
        resources: store.all("resource", user.id),
        posts: store.all("post", user.id),
        halls: store.all("hall", user.id).map((h) => ({
          ...h,
          events: h.events.map((e) => ({ ...e, rsvps: e.rsvps.length })),
        })),
        reports: store.all("report", user.id),
        following: store.targets("follow", user.id),
        blocks: store.targets("block", user.id),
        roomieLog: store.all("roomieLog", user.id),
      },
    };
  };
  actions["account.delete"] = async (user, p) => {
    const account = db
      .prepare("SELECT * FROM accounts WHERE user_id=?")
      .get(user.id);
    if (user.demo)
      fail(
        "Demo accounts are shared and cannot be deleted. Create a personal account to use deletion.",
        403,
      );
    if (
      account.password_hash &&
      !(await verifyPassword(p.password, account.password_hash))
    )
      fail("Confirm your password to delete your account.", 403);
    if (!account.password_hash && p.confirmation !== "DELETE")
      fail("Type DELETE to confirm permanent account deletion.", 403);
    leaveSession(user.id);
    for (const hall of store.all("hall", user.id)) {
      stopHallBroadcast(hall.id);
      hallAttendance.delete(hall.id);
    }
    const ownedUploads = store.all("upload", user.id);
    const relatedIds = store.db
      .prepare("SELECT id FROM entities WHERE owner_id=?")
      .all(user.id)
      .map((x) => x.id);
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM entities WHERE owner_id=? OR id=?").run(
        user.id,
        user.id,
      );
      db.prepare("DELETE FROM accounts WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM relations WHERE from_id=? OR to_id=?").run(
        user.id,
        user.id,
      );
      for (const entityId of relatedIds)
        db.prepare("DELETE FROM relations WHERE to_id=?").run(entityId);
      for (const request of store.all("request"))
        if (request.fromId === user.id || request.toId === user.id)
          store.remove(request.id);
      for (const hall of store.all("hall")) {
        hall.events = hall.events.map((e) => ({
          ...e,
          rsvps: e.rsvps.filter((x) => x !== user.id),
        }));
        hall.ticketUserIds = (hall.ticketUserIds || []).filter(
          (x) => x !== user.id,
        );
        store.put("hall", hall, hall.ownerId);
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    for (const upload of ownedUploads)
      try {
        unlinkSync(join(mediaDir, upload.filename));
      } catch {}
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === user.id) socket.disconnect(true);
    refreshAll();
    return { ok: true, deleted: true };
  };
  app.post("/api/action", requireAuth, async (req, res) => {
    cleanup();
    rate(`action:${req.user.id}`, 240, 60000);
    const type = text(req.body.type, 80, 1);
    if (
      req.user.needsConsent &&
      type !== "profile.complete" &&
      type !== "account.delete"
    )
      fail("Complete age and community consent before using Roomverse.", 403);
    const handler = actions[type];
    if (!handler) fail("Unknown action.", 404);
    const result = await handler(req.user, req.body);
    if (result.deleted) res.clearCookie("rv_session", { path: "/" });
    res.json(result);
  });

  app.post("/api/upload", requireAuth, (req, res) => {
    if (req.user.needsConsent)
      fail("Complete onboarding before uploading.", 403);
    rate(`upload:${req.user.id}`, 20, 60000);
    const kind = pick(
      req.body.kind,
      ["photo", "video", "artwork"],
      "upload kind",
    );
    const match =
      typeof req.body.dataUrl === "string" &&
      req.body.dataUrl.match(
        /^data:(image\/(?:png|jpeg|webp)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/]*={0,2})$/,
      );
    if (!match) fail("Upload PNG, JPEG, WebP, MP4, or WebM files.");
    const mime = match[1],
      bytes = Buffer.from(match[2], "base64");
    if (
      bytes.length === 0 ||
      bytes.length > (kind === "video" ? 20 : 5) * 1024 * 1024
    )
      fail(
        kind === "video"
          ? "Videos must be 20 MB or smaller."
          : "Images must be 5 MB or smaller.",
      );
    if ((kind === "video") !== mime.startsWith("video/"))
      fail("The file type does not match the selected upload.");
    const valid =
      mime === "image/png"
        ? bytes.length > 24 &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
          bytes.subarray(12, 16).toString() === "IHDR"
        : mime === "image/jpeg"
          ? bytes.length > 4 &&
            bytes[0] === 255 &&
            bytes[1] === 216 &&
            bytes[2] === 255
          : mime === "image/webp"
            ? bytes.length > 12 &&
              bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"
            : mime === "video/mp4"
              ? bytes.length > 12 && bytes.subarray(4, 8).toString() === "ftyp"
              : bytes.length > 4 &&
                bytes
                  .subarray(0, 4)
                  .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!valid) fail("The file contents do not match its declared media type.");
    const extension = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/webm": "webm",
      }[mime],
      filename = `${randomBytes(24).toString("hex")}.${extension}`,
      mediaUrl = `/media/${filename}`;
    writeFileSync(join(mediaDir, filename), bytes, { flag: "wx", mode: 0o600 });
    store.put(
      "upload",
      {
        id: id("upload_"),
        ownerId: req.user.id,
        url: mediaUrl,
        filename,
        mime,
        name: text(req.body.name ?? "Upload", 200),
        createdAt: now(),
      },
      req.user.id,
    );
    res.status(201).json({ url: mediaUrl });
  });
  app.get("/media/:filename", (req, res) => {
    const upload = store
      .all("upload")
      .find((u) => u.filename === req.params.filename);
    if (!upload) return res.status(404).end();
    const user = authFromCookie(req.headers.cookie);
    const userId = user?.id;
    let allowed = userId === upload.ownerId;
    for (const post of store.all("post"))
      if (
        post.mediaUrl === upload.url &&
        (userId ? canReadPost(userId, post) : post.visibility === "public")
      )
        allowed = true;
    for (const hall of store.all("hall"))
      if (
        hall.artworks.some((a) => a.url === upload.url) &&
        canReadHall(userId, hall)
      )
        allowed = true;
    for (const resource of store.all("resource"))
      if (
        resource.type === "memories" &&
        resource.content.some((m) => m.url === upload.url) &&
        userId &&
        readGrant(userId, resource)
      )
        allowed = true;
    if (!allowed) return res.status(userId ? 403 : 401).end();
    res.set("Content-Type", upload.mime);
    res.set("Cache-Control", "no-store");
    res.sendFile(join(mediaDir, upload.filename));
  });

  const callPeers = new Map(),
    hallBroadcasters = new Map(),
    hallWatchers = new Map();
  function emitCallPeers(session) {
    const peers = [...(callPeers.get(session.id) || [])];
    for (const userId of peers)
      io.to(`user:${userId}`).emit("call:peers", peers);
  }
  function removeCallPeer(session, userId) {
    if (!callPeers.get(session.id)?.delete(userId)) return;
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === userId) socket.data.callSessionId = null;
    for (const peer of callPeers.get(session.id) || [])
      io.to(`user:${peer}`).emit("call:peer-left", { userId });
    emitCallPeers(session);
  }
  function removeHallViewer(hallId, userId) {
    if (hallWatchers.get(hallId)?.delete(userId)) {
      const broadcaster = hallBroadcasters.get(hallId);
      if (broadcaster)
        io.to(`user:${broadcaster}`).emit("hall:viewer-left", {
          hallId,
          userId,
        });
    }
    for (const socket of io.sockets.sockets.values())
      if (socket.data.userId === userId)
        socket.data.watchingHalls?.delete(hallId);
  }
  function stopHallBroadcast(hallId) {
    const broadcaster = hallBroadcasters.get(hallId);
    hallBroadcasters.delete(hallId);
    if (broadcaster)
      for (const socket of io.sockets.sockets.values())
        if (socket.data.userId === broadcaster)
          socket.data.broadcastingHalls?.delete(hallId);
    for (const userId of hallWatchers.get(hallId) || [])
      io.to(`user:${userId}`).emit("hall:broadcaster", {
        hallId,
        userId: null,
      });
    io.to(`hall:${hallId}`).emit("hall:broadcaster", { hallId, userId: null });
  }
  function socketActor(socket) {
    const user = authFromCookie(socket.request.headers.cookie);
    if (!user) fail("Please sign in again.", 401);
    if (user.needsConsent) fail("Complete onboarding first.", 403);
    return user;
  }
  function socketParticipant(socket) {
    const user = socketActor(socket),
      session = sessionFor(user.id),
      participant = session?.participants.find((p) => p.userId === user.id);
    if (!session || !participant)
      fail("You are not admitted to an active room.", 403);
    return { user, session, participant };
  }
  function signalData(payload) {
    const result = {};
    if (payload.description !== undefined) {
      const d = payload.description;
      if (
        !d ||
        !["offer", "answer", "rollback", "pranswer"].includes(d.type) ||
        typeof d.sdp !== "string" ||
        d.sdp.length > 32000
      )
        fail("Invalid call description.");
      result.description = { type: d.type, sdp: d.sdp };
    }
    if (payload.candidate !== undefined) {
      if (
        payload.candidate !== null &&
        (typeof payload.candidate !== "object" ||
          JSON.stringify(payload.candidate).length > 4000)
      )
        fail("Invalid connection candidate.");
      result.candidate = payload.candidate;
    }
    if (!("description" in result) && !("candidate" in result))
      fail("No call signal was supplied.");
    return result;
  }
  io.use((socket, next) => {
    try {
      const user = authFromCookie(socket.request.headers.cookie);
      if (!user || user.needsConsent)
        return next(new Error("Authentication required."));
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Authentication required."));
    }
  });
  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    socketUsers.set(socket.id, userId);
    socket.data.watchingHalls = new Set();
    socket.data.broadcastingHalls = new Set();
    const existing = sessionFor(userId);
    if (existing) socket.join(`session:${existing.id}`);
    function on(event, handler, limit = 120) {
      socket.on(event, (payload = {}, callback) => {
        if (typeof payload === "function") {
          callback = payload;
          payload = {};
        }
        const reply = typeof callback === "function" ? callback : () => {};
        try {
          cleanup();
          rate(`socket:${userId}:${event}`, limit, 60000);
          const result = handler(payload, socket);
          reply(result ?? { ok: true });
        } catch (error) {
          reply({ ok: false, error: error.message });
        }
      });
    }
    on("session:join", () => {
      const { session } = socketParticipant(socket);
      socket.join(`session:${session.id}`);
      return { ok: true, sessionId: session.id };
    });
    on(
      "chat:send",
      (payload) => {
        const { user, session, participant } = socketParticipant(socket);
        if (!participant.permissions.chat)
          fail("The host has not enabled chat for you.", 403);
        const message = {
          id: id("chat_"),
          userId: user.id,
          text: text(payload.text, 1000, 1),
          createdAt: now(),
        };
        for (const p of session.participants)
          if (p.permissions.chat)
            io.to(`user:${p.userId}`).emit("chat:message", message);
        return { ok: true };
      },
      60,
    );
    on("call:join", () => {
      const { user, session, participant } = socketParticipant(socket);
      if (!participant.permissions.voice && !participant.permissions.screen)
        fail("The host has not enabled voice or screen for you.", 403);
      let peers = callPeers.get(session.id);
      if (!peers) {
        peers = new Set();
        callPeers.set(session.id, peers);
      }
      if (peers.size >= 6 && !peers.has(user.id))
        fail(
          "This call already has six participants. You can continue in room chat.",
          409,
        );
      peers.add(user.id);
      socket.data.callSessionId = session.id;
      emitCallPeers(session);
      return { ok: true, participants: [...peers] };
    });
    on("call:leave", () => {
      const user = socketActor(socket),
        session = sessionFor(user.id);
      if (session) removeCallPeer(session, user.id);
      return { ok: true };
    });
    on(
      "signal",
      (payload) => {
        const { user, session, participant } = socketParticipant(socket),
          target = session.participants.find(
            (p) => p.userId === payload.targetUserId,
          );
        if (
          !target ||
          target.userId === user.id ||
          blocked(user.id, target.userId) ||
          (!participant.permissions.voice && !participant.permissions.screen) ||
          (!target.permissions.voice && !target.permissions.screen)
        )
          fail("This call signal is not permitted.", 403);
        if (
          !callPeers.get(session.id)?.has(user.id) ||
          !callPeers.get(session.id)?.has(target.userId)
        )
          fail("Both people must join the call before signaling.", 403);
        io.to(`user:${target.userId}`).emit("signal", {
          fromUserId: user.id,
          ...signalData(payload),
        });
        return { ok: true };
      },
      180,
    );
    on("hall:join", (payload) => {
      const user = socketActor(socket),
        hall = checkedHall(payload.hallId, user);
      enterHall(user, hall.id);
      socket.join(`hall:${hall.id}`);
      socket.emit("hall:attendance", {
        hallId: hall.id,
        attendance: hallAttendance.get(hall.id)?.size || 0,
      });
      socket.emit("hall:broadcaster", {
        hallId: hall.id,
        userId: hallBroadcasters.get(hall.id) || null,
      });
      return { ok: true };
    });
    on("hall:leave", (payload) => {
      const user = socketActor(socket);
      socket.leave(`hall:${payload.hallId}`);
      leaveHall(user.id, payload.hallId);
      return { ok: true };
    });
    on("hall:heartbeat", (payload) => {
      const user = socketActor(socket),
        hall = checkedHall(payload.hallId, user);
      if (!socket.rooms.has(`hall:${hall.id}`))
        fail("Join this hall before sending a heartbeat.", 403);
      hallAttendance.get(hall.id)?.set(user.id, Date.now());
      return { ok: true };
    });
    on("hall:spotlight", (payload) => {
      const user = socketActor(socket);
      return actions["hall.spotlight"](user, payload);
    });
    on("hall:broadcast", (payload) => {
      const user = socketActor(socket),
        hall = checkedHall(payload.hallId, user, true),
        active = flag(payload.active);
      if (hall.ownerId !== user.id)
        fail("Only the creator can broadcast.", 403);
      if (active && (!hall.live || !hall.published || !user.verified))
        fail(
          "Start a published verified creator tour before broadcasting.",
          409,
        );
      if (active) {
        const old = hallBroadcasters.get(hall.id);
        if (old && old !== user.id) fail("Another broadcast is active.", 409);
        hallBroadcasters.set(hall.id, user.id);
        socket.data.broadcastingHalls.add(hall.id);
        socket.join(`hall:${hall.id}`);
        io.to(`hall:${hall.id}`).emit("hall:broadcaster", {
          hallId: hall.id,
          userId: user.id,
        });
        for (const viewer of hallWatchers.get(hall.id) || [])
          socket.emit("hall:viewer", { hallId: hall.id, userId: viewer });
      } else stopHallBroadcast(hall.id);
      return { ok: true };
    });
    on("hall:watch", (payload) => {
      const user = socketActor(socket),
        hall = checkedHall(payload.hallId, user);
      if (user.id === hall.ownerId)
        fail("Creators broadcast instead of watching their own tour.");
      if (!hall.live) fail("This hall is not hosting a live tour.", 409);
      let watchers = hallWatchers.get(hall.id);
      if (!watchers) {
        watchers = new Set();
        hallWatchers.set(hall.id, watchers);
      }
      if (watchers.size >= 50 && !watchers.has(user.id))
        fail("This broadcast has reached its 50-viewer limit.", 409);
      watchers.add(user.id);
      socket.data.watchingHalls.add(hall.id);
      socket.join(`hall:${hall.id}`);
      const broadcaster = hallBroadcasters.get(hall.id) || null;
      if (broadcaster)
        io.to(`user:${broadcaster}`).emit("hall:viewer", {
          hallId: hall.id,
          userId: user.id,
        });
      return { ok: true, broadcasterId: broadcaster };
    });
    on("hall:unwatch", (payload) => {
      const user = socketActor(socket);
      removeHallViewer(payload.hallId, user.id);
      return { ok: true };
    });
    on(
      "hall:signal",
      (payload) => {
        const user = socketActor(socket),
          hall = checkedHall(payload.hallId, user),
          broadcaster = hallBroadcasters.get(hall.id),
          target = text(payload.targetUserId, 100, 1);
        if (!hall.live || !broadcaster || blocked(user.id, target))
          fail("This hall broadcast has ended.", 403);
        const fromCreator = user.id === broadcaster && hall.ownerId === user.id,
          toCreator =
            target === broadcaster && hallWatchers.get(hall.id)?.has(user.id);
        if (fromCreator) {
          if (!hallWatchers.get(hall.id)?.has(target))
            fail("This viewer has not joined the broadcast.", 403);
        } else if (!toCreator)
          fail("Audience members cannot signal each other.", 403);
        const data = signalData(payload);
        if (
          !fromCreator &&
          data.description &&
          data.description.type !== "answer"
        )
          fail("Only the creator may offer a media stream.", 403);
        io.to(`user:${target}`).emit("hall:signal", {
          hallId: hall.id,
          fromUserId: user.id,
          ...data,
        });
        return { ok: true };
      },
      1200,
    );
    socket.on("disconnecting", () => {
      socket.data.departingHalls = [...socket.rooms].filter((r) =>
        r.startsWith("hall:"),
      );
    });
    socket.on("disconnect", () => {
      socketUsers.delete(socket.id);
      const others = [...io.sockets.sockets.values()].filter(
        (s) => s.data.userId === userId,
      );
      if (
        socket.data.callSessionId &&
        !others.some((s) => s.data.callSessionId === socket.data.callSessionId)
      ) {
        const session = activeSessions.get(socket.data.callSessionId);
        if (session) removeCallPeer(session, userId);
      }
      for (const hallId of socket.data.watchingHalls)
        if (!others.some((s) => s.data.watchingHalls?.has(hallId)))
          removeHallViewer(hallId, userId);
      for (const hallId of socket.data.broadcastingHalls)
        if (!others.some((s) => s.data.broadcastingHalls?.has(hallId)))
          stopHallBroadcast(hallId);
      for (const room of socket.data.departingHalls || [])
        if (room.startsWith("hall:") && !others.some((s) => s.rooms.has(room)))
          leaveHall(userId, room.slice(5));
    });
  });

  const timer = setInterval(cleanup, 30000);
  timer.unref();
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  let vite;
  if (development) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (existsSync(join(ROOT, "dist", "index.html"))) {
    app.use(express.static(join(ROOT, "dist")));
    app.get("/{*path}", (req, res) =>
      res.sendFile(join(ROOT, "dist", "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status ?? (error.type === "entity.too.large" ? 413 : 500);
    if (status >= 500)
      console.error("Roomverse operation failed:", error.code ?? error.name);
    res.status(status).json({
      error:
        status >= 500 && status !== 503 && status !== 502
          ? "Something went wrong. Please try again."
          : error.message,
    });
  });
  let closed = false;
  return {
    app,
    server: httpServer,
    httpServer,
    io,
    db,
    store,
    allowDemo,
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      if (vite) await vite.close();
      await new Promise((resolveClose) => io.close(resolveClose));
      db.close();
    },
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"));
  const runtime = await createServer({
    development: process.env.NODE_ENV !== "production",
  });
  const port = Number(process.env.PORT ?? 3000);
  runtime.httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Roomverse is listening on port ${port}.`);
    if (runtime.allowDemo)
      console.warn(
        "DEMO SIGN-IN IS ENABLED: demo accounts are shared. Set ALLOW_DEMO=false for private deployment.",
      );
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, async () => {
      await runtime.close();
      process.exit(0);
    });
}
