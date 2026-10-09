import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { io as connectSocket } from "socket.io-client";
import { createServer } from "../server/index.js";

const PASSWORD = "Roomverse-test-password-42";
const permissions = {
  chat: true,
  voice: true,
  screen: false,
  interact: false,
  invite: false,
};
let serial = 0;

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "roomverse-test-"));
  const dbPath = join(directory, "roomverse.sqlite");
  const instance = await createServer({
    dbPath,
    mediaDir: join(directory, "media"),
    allowDemo: true,
    ...options,
  });
  const server = instance.httpServer || instance.server;
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  t.after(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await instance.close();
    await rm(directory, { recursive: true, force: true });
  });

  function client() {
    let cookie = "";
    return {
      get cookie() {
        return cookie;
      },
      async request(path, body, method = body === undefined ? "GET" : "POST") {
        const response = await fetch(`${baseURL}${path}`, {
          method,
          headers: {
            ...(cookie ? { Cookie: cookie } : {}),
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const setCookies = response.headers.getSetCookie();
        if (setCookies.length)
          cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return { status: response.status, data, headers: response.headers };
      },
      async ok(path, body) {
        const result = await this.request(path, body);
        assert.ok(
          [200, 201].includes(result.status),
          `${path}: ${result.status} ${JSON.stringify(result.data)}`,
        );
        return result.data;
      },
      act(type, payload = {}) {
        return this.ok("/api/action", { type, ...payload });
      },
      boot() {
        return this.ok("/api/bootstrap");
      },
      async socket() {
        const socket = connectSocket(baseURL, {
          transports: ["websocket"],
          extraHeaders: { Cookie: cookie },
          forceNew: true,
          reconnection: false,
        });
        sockets.push(socket);
        await Promise.race([
          once(socket, "connect"),
          once(socket, "connect_error").then(([error]) => {
            throw error;
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Socket connection timed out")),
              4000,
            ).unref(),
          ),
        ]);
        return socket;
      },
    };
  }

  async function account(label = "user") {
    const user = client();
    const handle = `${label}${++serial}`;
    const response = await user.request("/api/auth/register", {
      handle,
      name: `Test ${label}`,
      email: `${handle}@example.test`,
      password: PASSWORD,
      age: 24,
      consent: true,
    });
    assert.ok(
      response.status === 200 || response.status === 201,
      JSON.stringify(response.data),
    );
    const data = await user.boot();
    user.id = data.user.id;
    user.handle = handle;
    user.email = `${handle}@example.test`;
    return user;
  }

  async function admit(host, guest, selectedPermissions = permissions) {
    await guest.act("knock.create", { userId: host.id, reason: "Hang out?" });
    const request = (await host.boot()).requests.find(
      (item) =>
        item.fromId === guest.id &&
        item.type === "knock" &&
        item.status === "pending",
    );
    assert.ok(request, "Host should receive a pending knock");
    await host.act("request.respond", {
      requestId: request.id,
      accept: true,
      permissions: selectedPermissions,
    });
    await guest.act("session.join", { requestId: request.id });
    return request;
  }

  return { ...instance, baseURL, directory, dbPath, client, account, admit };
}

function denied(result, message = "Unauthorized operation should be denied") {
  assert.ok(
    result.status >= 400 && result.status < 500,
    `${message}: ${result.status} ${JSON.stringify(result.data)}`,
  );
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket
      .timeout(2500)
      .emit(event, payload, (error, value) =>
        error ? reject(error) : resolve(value),
      );
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("account authentication, age consent, uniqueness and logout protect identity", async (t) => {
  const f = await fixture(t);
  const anon = f.client();
  denied(await anon.request("/api/bootstrap"));
  denied(
    await anon.request("/api/action", {
      type: "session.start",
      userId: "mika",
    }),
  );
  denied(
    await anon.request("/api/auth/register", {
      handle: "childaccount",
      name: "Child",
      email: "child@example.test",
      password: PASSWORD,
      age: 12,
      consent: true,
    }),
  );
  denied(
    await anon.request("/api/auth/register", {
      handle: "noconsent",
      name: "Consent",
      email: "consent@example.test",
      password: PASSWORD,
      age: 24,
      consent: false,
    }),
  );
  const owner = await f.account("identity");
  assert.match(owner.cookie, /.+/);
  const login = f.client();
  denied(
    await login.request("/api/auth/login", {
      email: owner.email,
      password: "wrong-password",
    }),
  );
  await login.ok("/api/auth/login", { email: owner.email, password: PASSWORD });
  assert.equal((await login.boot()).user.id, owner.id);
  const authResponse = await login.request("/api/auth/login", {
    email: owner.email,
    password: PASSWORD,
  });
  assert.match(authResponse.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(authResponse.headers.get("set-cookie"), /SameSite=/i);
  denied(
    await anon.request("/api/auth/register", {
      handle: owner.handle.toUpperCase(),
      name: "Impersonator",
      email: "duplicate@example.test",
      password: PASSWORD,
      age: 24,
      consent: true,
    }),
  );
  const exported = await owner.act("account.export");
  assert.doesNotMatch(
    JSON.stringify(exported),
    /passwordHash|passwordSalt|sessionToken|googleAccessToken/,
  );
  await login.ok("/api/auth/logout", {});
  denied(await login.request("/api/bootstrap"));
});

test("forged socket identity and cross-origin state changes are rejected", async (t) => {
  const f = await fixture(t);
  const owner = await f.account("origins");
  const response = await fetch(`${f.baseURL}/api/action`, {
    method: "POST",
    headers: {
      Cookie: owner.cookie,
      Origin: "https://another.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "profile.update",
      name: "Cross-origin attacker",
    }),
  });
  assert.equal(response.status, 403);
  assert.equal((await owner.boot()).user.name, "Test origins");
  const socket = connectSocket(f.baseURL, {
    transports: ["websocket"],
    auth: { userId: owner.id },
    query: { userId: owner.id },
    extraHeaders: { Cookie: `rv_session=${owner.id}` },
    forceNew: true,
    reconnection: false,
  });
  t.after(() => socket.disconnect());
  const rejected = await Promise.race([
    once(socket, "connect_error").then(() => true),
    once(socket, "connect").then(() => false),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Forged socket connection timed out")),
        4000,
      ).unref(),
    ),
  ]);
  assert.equal(
    rejected,
    true,
    "Socket authentication must use a valid server-issued cookie",
  );
});

test("Google-style accounts cannot activate without a finite adult age and explicit consent", async (t) => {
  const f = await fixture(t);
  const user = await f.account("pendingconsent");
  const pending = f.store.get(user.id);
  pending.needsConsent = true;
  f.store.put("user", pending);
  assert.equal((await user.boot()).user.needsConsent, true);
  denied(
    await user.request("/api/action", {
      type: "profile.update",
      name: "Activation bypass",
    }),
  );
  for (const age of [undefined, "not-a-number", null, 12, 121])
    denied(
      await user.request("/api/action", {
        type: "profile.complete",
        age,
        consent: true,
      }),
    );
  denied(
    await user.request("/api/action", {
      type: "profile.complete",
      age: 24,
      consent: false,
    }),
  );
  await user.act("profile.complete", { age: 24, consent: true });
  assert.equal((await user.boot()).user.needsConsent, false);
  await user.act("profile.update", { name: "Activated with consent" });
});

test("public profiles and follows never disclose private resources or grant room access", async (t) => {
  const f = await fixture(t);
  const host = await f.account("privacy");
  const guest = await f.account("follower");
  const resource = (await host.boot()).resources.find(
    (item) => item.type === "journal",
  );
  const secret = "NEVER-PUBLIC-JOURNAL-9b8c";
  await host.act("resource.save", {
    resourceId: resource.id,
    content: [
      { id: "entry", title: "Secret", text: secret, date: "2026-10-09" },
    ],
  });
  await guest.act("follow.toggle", { userId: host.id });
  const bootstrap = await guest.boot();
  assert.equal(
    bootstrap.users.find((item) => item.id === host.id).following,
    true,
  );
  assert.equal(bootstrap.session, null);
  assert.ok(bootstrap.resources.every((item) => item.id !== resource.id));
  assert.doesNotMatch(JSON.stringify(bootstrap), new RegExp(secret));
  denied(await guest.request(`/api/resources/${resource.id}`));
  denied(
    await guest.request("/api/action", {
      type: "resource.save",
      resourceId: resource.id,
      content: [],
    }),
  );
  denied(
    await guest.request("/api/action", {
      type: "resource.request",
      resourceId: resource.id,
      scope: "read",
    }),
  );
});

test("contact matching requires reciprocal consent and respects discovery and blocks without returning emails", async (t) => {
  const f = await fixture(t);
  const owner = await f.account("contactowner");
  const contact = await f.account("contactpeer");
  denied(
    await owner.request("/api/action", {
      type: "contacts.match",
      emails: [contact.email],
    }),
  );
  await owner.act("settings.update", { settings: { contactSync: true } });
  assert.deepEqual(
    (await owner.act("contacts.match", { emails: [contact.email] })).matches,
    [],
  );
  await contact.act("settings.update", { settings: { contactSync: true } });
  const matched = await owner.act("contacts.match", {
    emails: [contact.email, contact.email],
  });
  assert.equal(matched.matches.length, 1);
  assert.equal(matched.matches[0].id, contact.id);
  assert.ok(
    !JSON.stringify(matched).includes(contact.email),
    "Contact email must not appear in the public-profile result",
  );
  await contact.act("settings.update", { settings: { discoverable: false } });
  assert.deepEqual(
    (await owner.act("contacts.match", { emails: [contact.email] })).matches,
    [],
  );
  await contact.act("settings.update", { settings: { discoverable: true } });
  await owner.act("block.toggle", { userId: contact.id });
  assert.deepEqual(
    (await owner.act("contacts.match", { emails: [contact.email] })).matches,
    [],
  );
  await owner.act("contacts.clear");
  assert.equal((await owner.boot()).user.settings.contactSync, false);
  denied(
    await owner.request("/api/action", {
      type: "contacts.match",
      emails: [contact.email],
    }),
  );
});

test("knock acceptance authorizes only a voluntary join and room visuals remain redacted", async (t) => {
  const f = await fixture(t);
  const host = await f.account("host");
  const guest = await f.account("guest");
  const resource = (await host.boot()).resources.find(
    (item) => item.type === "tasks",
  );
  await host.act("resource.save", {
    resourceId: resource.id,
    content: [
      { id: "sensitive", text: "PRIVATE-INTERVIEW-SCHEDULE", done: false },
    ],
  });
  await guest.act("knock.create", { userId: host.id, reason: "Can we talk?" });
  const request = (await host.boot()).requests.find(
    (item) => item.fromId === guest.id && item.type === "knock",
  );
  assert.equal((await guest.boot()).session, null);
  denied(
    await guest.request("/api/action", {
      type: "request.respond",
      requestId: request.id,
      accept: true,
    }),
  );
  await host.act("request.respond", {
    requestId: request.id,
    accept: true,
    permissions,
  });
  assert.equal(
    (await guest.boot()).session,
    null,
    "Accepting must not force the guest into a room",
  );
  await guest.act("session.join", { requestId: request.id });
  const data = await guest.boot();
  assert.ok(data.session.participants.some((item) => item.userId === guest.id));
  assert.ok(data.session.room.objects.length > 0);
  assert.doesNotMatch(
    JSON.stringify(data.session.room),
    /PRIVATE-INTERVIEW-SCHEDULE/,
  );
  denied(await guest.request(`/api/resources/${resource.id}`));
  denied(
    await guest.request("/api/action", {
      type: "session.permissions",
      userId: host.id,
      permissions: { chat: false },
    }),
  );
});

test("invites need invitee consent and an explicit join; declined invites cannot join", async (t) => {
  const f = await fixture(t);
  const host = await f.account("inviter");
  const guest = await f.account("invitee");
  await host.act("invite.create", { userId: guest.id });
  const request = (await guest.boot()).requests.find(
    (item) => item.type === "invite" && item.fromId === host.id,
  );
  denied(
    await guest.request("/api/action", {
      type: "session.join",
      requestId: request.id,
    }),
  );
  await guest.act("request.respond", { requestId: request.id, accept: true });
  assert.equal((await guest.boot()).session, null);
  await guest.act("session.join", { requestId: request.id });
  await guest.act("session.leave");
  const second = await f.account("decliner");
  await host.act("invite.create", { userId: second.id });
  const declined = (await second.boot()).requests.find(
    (item) => item.type === "invite" && item.fromId === host.id,
  );
  await second.act("request.respond", {
    requestId: declined.id,
    accept: false,
  });
  denied(
    await second.request("/api/action", {
      type: "session.join",
      requestId: declined.id,
    }),
  );
});

test("guest invitations require host permission and invitees cannot escalate granted privileges", async (t) => {
  const f = await fixture(t);
  const host = await f.account("invitehost");
  const guest = await f.account("guestinviter");
  const third = await f.account("guestinvitee");
  await f.admit(host, guest);
  denied(
    await guest.request("/api/action", {
      type: "invite.create",
      userId: third.id,
    }),
  );
  await host.act("session.permissions", {
    userId: guest.id,
    permissions: { ...permissions, invite: true },
  });
  await guest.act("invite.create", {
    userId: third.id,
    permissions: {
      chat: true,
      voice: true,
      screen: true,
      interact: true,
      invite: true,
    },
  });
  const invitation = (await third.boot()).requests.find(
    (item) =>
      item.type === "invite" &&
      item.fromId === guest.id &&
      item.toId === third.id,
  );
  assert.ok(invitation);
  await third.act("request.respond", {
    requestId: invitation.id,
    accept: true,
    permissions: {
      chat: true,
      voice: true,
      screen: true,
      interact: true,
      invite: true,
    },
  });
  await third.act("session.join", { requestId: invitation.id });
  const session = (await third.boot()).session;
  assert.equal(
    session.hostId,
    host.id,
    "Guest invitations must target the original host room",
  );
  const granted = session.participants.find(
    (item) => item.userId === third.id,
  ).permissions;
  assert.equal(granted.chat, true);
  for (const key of ["voice", "screen", "interact", "invite"])
    assert.equal(granted[key], false, `Invitee must not self-grant ${key}`);
});

test("private content grants are per guest; write, read-only, revocation and leave are enforced", async (t) => {
  const f = await fixture(t);
  const host = await f.account("grantowner");
  const guest = await f.account("grantee");
  const other = await f.account("otherguest");
  await f.admit(host, guest);
  await f.admit(host, other);
  const resource = (await host.boot()).resources.find(
    (item) => item.type === "whiteboard",
  );
  await guest.act("resource.request", {
    resourceId: resource.id,
    scope: "write",
  });
  const request = (await host.boot()).requests.find(
    (item) =>
      item.type === "access" &&
      item.fromId === guest.id &&
      item.resourceId === resource.id &&
      item.status === "pending",
  );
  await host.act("resource.grant", { requestId: request.id, scope: "write" });
  await guest.ok(`/api/resources/${resource.id}`);
  await guest.act("resource.save", {
    resourceId: resource.id,
    content: { text: "An explicitly shared idea" },
  });
  assert.match(
    JSON.stringify(await host.ok(`/api/resources/${resource.id}`)),
    /An explicitly shared idea/,
  );
  denied(await other.request(`/api/resources/${resource.id}`));
  denied(
    await other.request("/api/action", {
      type: "resource.save",
      resourceId: resource.id,
      content: { text: "Intrusion" },
    }),
  );
  await host.act("resource.revoke", {
    resourceId: resource.id,
    userId: guest.id,
  });
  denied(await guest.request(`/api/resources/${resource.id}`));
  denied(
    await guest.request("/api/action", {
      type: "resource.save",
      resourceId: resource.id,
      content: { text: "After revocation" },
    }),
  );
  await guest.act("resource.request", {
    resourceId: resource.id,
    scope: "read",
  });
  const readRequest = (await host.boot()).requests.find(
    (item) =>
      item.type === "access" &&
      item.fromId === guest.id &&
      item.resourceId === resource.id &&
      item.status === "pending",
  );
  await host.act("resource.grant", {
    requestId: readRequest.id,
    scope: "read",
  });
  await guest.ok(`/api/resources/${resource.id}`);
  denied(
    await guest.request("/api/action", {
      type: "resource.save",
      resourceId: resource.id,
      content: { text: "Read-only intrusion" },
    }),
  );
  await guest.act("session.leave");
  denied(await guest.request(`/api/resources/${resource.id}`));
  assert.equal((await guest.boot()).session, null);
});

test("read-once access closes explicitly and removing a participant immediately removes grants", async (t) => {
  const f = await fixture(t);
  const host = await f.account("onceowner");
  const guest = await f.account("onceguest");
  const admission = await f.admit(host, guest);
  const resource = (await host.boot()).resources.find(
    (item) => item.type === "journal",
  );
  await guest.act("resource.request", {
    resourceId: resource.id,
    scope: "once",
  });
  const request = (await host.boot()).requests.find(
    (item) => item.type === "access" && item.fromId === guest.id,
  );
  await host.act("resource.grant", { requestId: request.id, scope: "once" });
  await guest.ok(`/api/resources/${resource.id}`);
  await guest.act("resource.close", { resourceId: resource.id });
  denied(await guest.request(`/api/resources/${resource.id}`));
  await host.act("session.remove", { userId: guest.id });
  assert.equal((await guest.boot()).session, null);
  denied(
    await guest.request("/api/action", {
      type: "session.join",
      requestId: admission.id,
    }),
  );
});

test("blocking removes interaction rights, follow edges and current admission", async (t) => {
  const f = await fixture(t);
  const host = await f.account("blockowner");
  const guest = await f.account("blocked");
  await guest.act("follow.toggle", { userId: host.id });
  await f.admit(host, guest);
  await host.act("block.toggle", { userId: guest.id });
  assert.equal((await guest.boot()).session, null);
  denied(
    await guest.request("/api/action", {
      type: "knock.create",
      userId: host.id,
      reason: "Hang out?",
    }),
  );
  denied(
    await guest.request("/api/action", {
      type: "follow.toggle",
      userId: host.id,
    }),
  );
  denied(
    await guest.request("/api/action", {
      type: "invite.create",
      userId: host.id,
    }),
  );
});

test("chat is live-only, excludes unadmitted users, has no catchup and rejects departed guests", async (t) => {
  const f = await fixture(t);
  const host = await f.account("chathost");
  const guest = await f.account("chatguest");
  const outsider = await f.account("outsider");
  await f.admit(host, guest);
  const hs = await host.socket();
  const gs = await guest.socket();
  const os = await outsider.socket();
  let leaked = false;
  os.on("chat:message", () => {
    leaked = true;
  });
  const firstMessage = once(hs, "chat:message");
  const result = await emit(gs, "chat:send", { text: "EPHEMERAL-ONLY-a17c" });
  assert.equal(result.ok, true, JSON.stringify(result));
  const [message] = await firstMessage;
  assert.equal(message.text, "EPHEMERAL-ONLY-a17c");
  assert.equal(message.userId, guest.id);
  const forbidden = await emit(os, "chat:send", {
    text: "Unauthorized message",
  });
  assert.equal(forbidden.ok, false);
  const late = await f.account("lateguest");
  await f.admit(host, late);
  const ls = await late.socket();
  let replayed = false;
  ls.on("chat:message", () => {
    replayed = true;
  });
  await wait(80);
  assert.equal(leaked, false);
  assert.equal(
    replayed,
    false,
    "Late participants must not receive prior messages",
  );
  assert.doesNotMatch(
    JSON.stringify(await guest.boot()),
    /EPHEMERAL-ONLY-a17c/,
  );
  await guest.act("session.leave");
  assert.equal(
    (await emit(gs, "chat:send", { text: "After leaving" })).ok,
    false,
  );
  await host.act("session.end");
  assert.equal(
    (await emit(hs, "chat:send", { text: "After ending" })).ok,
    false,
  );
  assert.doesNotMatch(
    (await readFile(f.dbPath)).toString(),
    /EPHEMERAL-ONLY-a17c/,
  );
});

test("per-guest chat revocation and host authority are enforced", async (t) => {
  const f = await fixture(t);
  const host = await f.account("permissionhost");
  const guest = await f.account("permissionguest");
  await f.admit(host, guest, { ...permissions, chat: false, voice: false });
  const socket = await guest.socket();
  assert.equal(
    (await emit(socket, "chat:send", { text: "No permission" })).ok,
    false,
  );
  denied(await guest.request("/api/action", { type: "session.end" }));
  denied(
    await guest.request("/api/action", {
      type: "session.remove",
      userId: host.id,
    }),
  );
  await host.act("session.permissions", { userId: guest.id, permissions });
  assert.equal(
    (await emit(socket, "chat:send", { text: "Permission granted" })).ok,
    true,
  );
  await host.act("session.permissions", {
    userId: guest.id,
    permissions: { ...permissions, chat: false },
  });
  assert.equal(
    (await emit(socket, "chat:send", { text: "Permission revoked" })).ok,
    false,
  );
});

test("call signalling requires admission, host media permission and both users joining the call", async (t) => {
  const f = await fixture(t);
  const host = await f.account("signalhost");
  const guest = await f.account("signalguest");
  const outsider = await f.account("signaloutsider");
  await f.admit(host, guest, { ...permissions, voice: false, screen: false });
  const hs = await host.socket();
  const gs = await guest.socket();
  const os = await outsider.socket();
  const description = {
    type: "offer",
    sdp: "v=0\r\ns=Roomverse permission test\r\n",
  };
  assert.equal((await emit(os, "call:join", {})).ok, false);
  assert.equal((await emit(gs, "call:join", {})).ok, false);
  assert.equal(
    (await emit(gs, "signal", { targetUserId: host.id, description })).ok,
    false,
  );
  await host.act("session.permissions", { userId: guest.id, permissions });
  assert.equal((await emit(gs, "call:join", {})).ok, true);
  assert.equal(
    (await emit(gs, "signal", { targetUserId: host.id, description })).ok,
    false,
    "A target who has not joined the call must not receive offers",
  );
  assert.equal((await emit(hs, "call:join", {})).ok, true);
  const received = once(hs, "signal");
  assert.equal(
    (await emit(gs, "signal", { targetUserId: host.id, description })).ok,
    true,
  );
  const [signal] = await received;
  assert.equal(signal.fromUserId, guest.id);
  assert.deepEqual(signal.description, description);
  assert.equal(
    (await emit(gs, "signal", { targetUserId: outsider.id, description })).ok,
    false,
  );
  await host.act("session.permissions", {
    userId: guest.id,
    permissions: { ...permissions, voice: false, screen: false },
  });
  assert.equal(
    (await emit(gs, "signal", { targetUserId: host.id, description })).ok,
    false,
  );
});

test("room optimistic versioning, preview/apply and undo do not permit cross-owner edits", async (t) => {
  const f = await fixture(t);
  const owner = await f.account("editor");
  const stranger = await f.account("intruder");
  const before = (await owner.boot()).room;
  const proposal = await owner.act("roomie.preview", {
    prompt: "Make my room cozy with plants",
  });
  assert.deepEqual(
    (await owner.boot()).room,
    before,
    "Preview should not modify room",
  );
  await owner.act("roomie.apply", {
    proposal: proposal.proposal,
    version: before.version,
  });
  const edited = (await owner.boot()).room;
  assert.ok(edited.version > before.version);
  denied(
    await owner.request("/api/action", {
      type: "room.update",
      version: before.version,
      theme: "midnight",
    }),
  );
  denied(
    await stranger.request("/api/action", {
      type: "room.update",
      version: (await stranger.boot()).room.version,
      theme: "midnight",
      roomId: before.id,
      ownerId: owner.id,
    }),
  );
  assert.deepEqual(
    (await owner.boot()).room,
    edited,
    "Caller-supplied owner identity must never target another room",
  );
  await owner.act("room.undo");
  assert.equal((await owner.boot()).room.theme, before.theme);
});

test("creator verification gates publishing and hall edits and moderation stay owner scoped", async (t) => {
  const f = await fixture(t);
  const creator = await f.account("creator");
  const stranger = await f.account("galleryintruder");
  await stranger.act("hall.save", {
    hall: {
      title: "Unverified draft",
      description: "Not yet approved",
      cover: "tide",
      theme: "sage",
      access: "public",
      artworks: [],
    },
  });
  const draft = (await stranger.boot()).halls.find(
    (item) => item.ownerId === stranger.id,
  );
  denied(
    await stranger.request("/api/action", {
      type: "hall.publish",
      hallId: draft.id,
      published: true,
    }),
  );
  await creator.act("verification.apply", {
    name: "Test Artist",
    website: "https://example.test",
    statement: "I own my artwork and seek creator verification.",
  });
  denied(
    await stranger.request("/api/action", {
      type: "verification.review",
      userId: creator.id,
      approved: true,
    }),
  );
  const admin = f.client();
  await admin.ok("/api/auth/demo", { handle: "admin" });
  await admin.act("verification.review", {
    userId: creator.id,
    approved: true,
  });
  assert.equal((await creator.boot()).user.verified, true);
  await creator.act("hall.save", {
    hall: {
      title: "Test gallery",
      description: "An original test exhibition",
      cover: "bloom",
      theme: "sage",
      access: "public",
      artworks: [
        {
          id: "testart",
          title: "Original",
          description: "A study",
          medium: "Digital",
          year: "2026",
          variant: "bloom",
        },
      ],
    },
  });
  const hall = (await creator.boot()).halls.find(
    (item) => item.ownerId === creator.id && item.title === "Test gallery",
  );
  assert.ok(hall);
  assert.equal(hall.published, false);
  assert.ok(!(await stranger.boot()).halls.some((item) => item.id === hall.id));
  denied(
    await stranger.request("/api/action", {
      type: "hall.save",
      hall: { ...hall, title: "Hijacked" },
    }),
  );
  denied(
    await stranger.request("/api/action", {
      type: "hall.publish",
      hallId: hall.id,
      published: true,
    }),
  );
  await creator.act("hall.publish", { hallId: hall.id, published: true });
  assert.ok((await stranger.boot()).halls.some((item) => item.id === hall.id));
  await creator.act("hall.live", { hallId: hall.id, live: true });
  await stranger.act("hall.enter", { hallId: hall.id });
  await stranger.act("hall.question", {
    hallId: hall.id,
    text: "How did you choose the colors?",
  });
  denied(
    await stranger.request("/api/action", {
      type: "hall.live",
      hallId: hall.id,
      live: false,
    }),
  );
  denied(
    await stranger.request("/api/action", {
      type: "hall.spotlight",
      hallId: hall.id,
      artworkId: "testart",
    }),
  );
});

test("public halls expose aggregate attendance, never audience identities or personal content", async (t) => {
  const f = await fixture(t);
  const viewer = await f.account("hallvisitor");
  const hall = (await viewer.boot()).halls.find(
    (item) => item.published && item.access === "public",
  );
  assert.ok(hall, "Seed should include a public creator hall");
  const prior = hall.attendance;
  await viewer.act("hall.enter", { hallId: hall.id });
  await viewer.act("hall.enter", { hallId: hall.id });
  const visible = (await viewer.boot()).halls.find(
    (item) => item.id === hall.id,
  );
  assert.equal(
    visible.attendance,
    prior + 1,
    "Repeated entry must count a person once",
  );
  assert.equal(typeof visible.attendance, "number");
  const publicResponse = await f.client().ok("/api/public/halls");
  const serialized = JSON.stringify(publicResponse);
  assert.ok(
    !serialized.includes(viewer.id),
    "Anonymous preview must not disclose audience user IDs",
  );
  assert.doesNotMatch(
    serialized,
    /passwordHash|passwordSalt|journal|participants|attendees|audienceAvatars/,
  );
  assert.doesNotMatch(
    JSON.stringify(visible),
    /participants|attendees|audienceAvatars/,
  );
  await viewer.act("hall.leave", { hallId: hall.id });
  assert.equal(
    (await viewer.boot()).halls.find((item) => item.id === hall.id).attendance,
    prior,
  );
});

test("uploads reject active content and forged MIME types; accepted media uses safe opaque URLs", async (t) => {
  const f = await fixture(t);
  const user = await f.account("uploader");
  denied(
    await f
      .client()
      .request("/api/upload", {
        dataUrl: "data:image/png;base64,aGVsbG8=",
        kind: "photo",
        name: "test.png",
      }),
  );
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
  ).toString("base64");
  denied(
    await user.request("/api/upload", {
      dataUrl: `data:image/svg+xml;base64,${svg}`,
      kind: "photo",
      name: "attack.svg",
    }),
  );
  const html = Buffer.from("<script>alert(document.cookie)</script>").toString(
    "base64",
  );
  denied(
    await user.request("/api/upload", {
      dataUrl: `data:image/png;base64,${html}`,
      kind: "photo",
      name: "fake.png",
    }),
  );
  denied(
    await user.request("/api/upload", {
      dataUrl: `data:text/html;base64,${html}`,
      kind: "artwork",
      name: "attack.html",
    }),
  );
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/wAAAABJRU5ErkJggg==";
  const uploaded = await user.ok("/api/upload", {
    dataUrl: `data:image/png;base64,${png}`,
    kind: "photo",
    name: "../../unsafe<script>.png",
  });
  assert.match(uploaded.url, /^\/media\/[A-Za-z0-9_-]+\.png$/);
  const anonymousMedia = await fetch(`${f.baseURL}${uploaded.url}`);
  assert.equal(
    anonymousMedia.status,
    401,
    "Unpublished media must remain private",
  );
  const media = await fetch(`${f.baseURL}${uploaded.url}`, {
    headers: { Cookie: user.cookie },
  });
  assert.equal(media.status, 200);
  assert.match(media.headers.get("content-type"), /^image\/png/);
  assert.equal(media.headers.get("x-content-type-options"), "nosniff");
});

test("private memory media follows resource grants and cannot be republished by another account", async (t) => {
  const f = await fixture(t);
  const owner = await f.account("memoryowner");
  const guest = await f.account("memoryguest");
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/wAAAABJRU5ErkJggg==";
  const upload = await owner.ok("/api/upload", {
    dataUrl: `data:image/png;base64,${png}`,
    kind: "photo",
    name: "Private memory.png",
  });
  const resource = (await owner.boot()).resources.find(
    (item) => item.type === "memories",
  );
  await owner.act("resource.save", {
    resourceId: resource.id,
    content: [{ id: "photo", title: "Private memory", url: upload.url }],
  });
  denied(await guest.request(upload.url));
  denied(
    await guest.request("/api/action", {
      type: "post.create",
      caption: "Stolen photo",
      mediaType: "photo",
      mediaUrl: upload.url,
      variant: "sunset",
      visibility: "public",
    }),
  );
  await f.admit(owner, guest);
  await guest.act("resource.request", {
    resourceId: resource.id,
    scope: "read",
  });
  const request = (await owner.boot()).requests.find(
    (item) =>
      item.type === "access" &&
      item.fromId === guest.id &&
      item.resourceId === resource.id,
  );
  await owner.act("resource.grant", { requestId: request.id, scope: "read" });
  const shared = await guest.request(upload.url);
  assert.equal(shared.status, 200);
  assert.match(
    shared.headers.get("cache-control"),
    /no-store/,
    "Revocable private media must not remain reusable in an HTTP cache",
  );
  await owner.act("resource.revoke", {
    resourceId: resource.id,
    userId: guest.id,
  });
  denied(await guest.request(upload.url));
});

test("posts enforce visibility and author ownership; account deletion revokes sessions", async (t) => {
  const f = await fixture(t);
  const owner = await f.account("postauthor");
  const visitor = await f.account("postvisitor");
  await owner.act("post.create", {
    caption: "FOLLOWERS-ONLY-f993",
    variant: "sunset",
    mediaType: "postcard",
    visibility: "followers",
  });
  const post = (await owner.boot()).posts.find(
    (item) => item.caption === "FOLLOWERS-ONLY-f993",
  );
  assert.ok(post);
  assert.ok(!(await visitor.boot()).posts.some((item) => item.id === post.id));
  await visitor.act("follow.toggle", { userId: owner.id });
  assert.ok((await visitor.boot()).posts.some((item) => item.id === post.id));
  denied(
    await visitor.request("/api/action", {
      type: "post.delete",
      postId: post.id,
    }),
  );
  denied(
    await visitor.request("/api/action", {
      type: "account.delete",
      password: "wrong-password",
    }),
  );
  await visitor.act("account.delete", { password: PASSWORD });
  denied(await visitor.request("/api/bootstrap"));
});
