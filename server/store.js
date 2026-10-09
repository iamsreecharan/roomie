import { DatabaseSync } from "node:sqlite";
import {
  randomUUID,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

const scrypt = promisify(scryptCallback);
export const id = (prefix = "") => `${prefix}${randomUUID()}`;
export const now = () => new Date().toISOString();
export const defaults = () => ({
  knocks: "everyone",
  discoverable: true,
  onlineVisible: true,
  contactSync: false,
  reducedMotion: false,
  highContrast: false,
  notifications: true,
});
export const avatar = (i = 0) => ({
  skin: ["#d9a982", "#eec5ab", "#8d5944", "#a47452"][i % 4],
  hair: ["#272735", "#472d29", "#d6a162", "#242c3f"][i % 4],
  hairStyle: ["waves", "crop", "bob", "curls"][i % 4],
  outfit: ["#708b75", "#b784a9", "#799eb4", "#de927b"][i % 4],
  accessory: ["none", "glasses", "earrings", "cap"][i % 4],
});
export const roomObjects = () => [
  { id: id("obj_"), type: "rug", x: 48, y: 70, rotation: 0, color: "#eed2b0" },
  { id: id("obj_"), type: "sofa", x: 39, y: 53, rotation: 0, color: "#c97659" },
  {
    id: id("obj_"),
    type: "plant",
    x: 76,
    y: 52,
    rotation: 0,
    color: "#718f68",
  },
  { id: id("obj_"), type: "desk", x: 70, y: 59, rotation: 0, color: "#b89873" },
  { id: id("obj_"), type: "lamp", x: 27, y: 49, rotation: 0, color: "#e6c99f" },
  { id: id("obj_"), type: "art", x: 63, y: 31, rotation: 0, color: "#d7a181" },
  {
    id: id("obj_"),
    type: "shelf",
    x: 20,
    y: 46,
    rotation: 0,
    color: "#aa8966",
  },
  {
    id: id("obj_"),
    type: "table",
    x: 44,
    y: 65,
    rotation: 0,
    color: "#c4aa85",
  },
];

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  if (!stored || typeof password !== "string") return false;
  const [salt, encoded] = stored.split(":");
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(encoded, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createStore(path) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner_id TEXT,data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS entities_kind ON entities(kind,owner_id);
    CREATE TABLE IF NOT EXISTS accounts(user_id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT,google_sub TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS auth_sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS relations(kind TEXT NOT NULL,from_id TEXT NOT NULL,to_id TEXT NOT NULL,PRIMARY KEY(kind,from_id,to_id));
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  const getStmt = db.prepare("SELECT data FROM entities WHERE id=?");
  const allStmt = db.prepare("SELECT data FROM entities WHERE kind=?");
  const ownerStmt = db.prepare(
    "SELECT data FROM entities WHERE kind=? AND owner_id=?",
  );
  const setStmt = db.prepare(
    "INSERT INTO entities(id,kind,owner_id,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id,data=excluded.data",
  );
  const store = {
    db,
    get(entityId) {
      if (typeof entityId !== "string") return null;
      const row = getStmt.get(entityId);
      return row ? JSON.parse(row.data) : null;
    },
    all(kind, owner) {
      return (
        owner === undefined ? allStmt.all(kind) : ownerStmt.all(kind, owner)
      ).map((row) => JSON.parse(row.data));
    },
    put(kind, item, owner = item.ownerId ?? item.userId ?? null) {
      setStmt.run(item.id, kind, owner, JSON.stringify(item));
      return item;
    },
    remove(entityId) {
      db.prepare("DELETE FROM entities WHERE id=?").run(entityId);
    },
    has(kind, from, to) {
      return !!db
        .prepare(
          "SELECT 1 FROM relations WHERE kind=? AND from_id=? AND to_id=?",
        )
        .get(kind, from, to);
    },
    link(kind, from, to) {
      db.prepare("INSERT OR IGNORE INTO relations VALUES(?,?,?)").run(
        kind,
        from,
        to,
      );
    },
    unlink(kind, from, to) {
      db.prepare(
        "DELETE FROM relations WHERE kind=? AND from_id=? AND to_id=?",
      ).run(kind, from, to);
    },
    count(kind, to) {
      return Number(
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM relations WHERE kind=? AND to_id=?",
          )
          .get(kind, to).n,
      );
    },
    targets(kind, from) {
      return db
        .prepare("SELECT to_id FROM relations WHERE kind=? AND from_id=?")
        .all(kind, from)
        .map((x) => x.to_id);
    },
  };
  return store;
}

export function addHome(store, user, seed = false) {
  store.put(
    "room",
    {
      id: id("room_"),
      ownerId: user.id,
      theme: "sage",
      version: 1,
      objects: roomObjects(),
      history: [],
    },
    user.id,
  );
  const contents = {
    tasks: seed
      ? [
          {
            id: id("task_"),
            text: "Make room for a slower morning",
            done: false,
          },
          {
            id: id("task_"),
            text: "Sketch something just for you",
            done: true,
          },
        ]
      : [],
    journal: seed
      ? [
          {
            id: id("entry_"),
            title: "A little space to be myself",
            text: "Today I made room for the things that matter. This journal stays private unless I choose to share it.",
            date: now().slice(0, 10),
          },
        ]
      : [],
    planner: seed
      ? [
          {
            id: id("event_"),
            title: "Quiet studio time",
            date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          },
        ]
      : [],
    memories: [],
    whiteboard: { text: seed ? "Ideas for a softer kind of internet ✦" : "" },
  };
  for (const type of Object.keys(contents))
    store.put(
      "resource",
      {
        id: id("resource_"),
        ownerId: user.id,
        type,
        title: {
          tasks: "Little things to do",
          journal: "My private journal",
          planner: "My planner",
          memories: "Memory box",
          whiteboard: "Idea wall",
        }[type],
        content: contents[type],
      },
      user.id,
    );
}

export async function seedStore(store, allowDemo) {
  if (
    !allowDemo ||
    store.db.prepare("SELECT 1 FROM metadata WHERE key=?").get("demo_seeded")
  )
    return;
  const names = [
    [
      "mika",
      "Mika Chen",
      "A softer corner of the internet. Plants, playlists & little experiments.",
      "user",
    ],
    [
      "kira",
      "Kira Sol",
      "Painting the feeling between sunset and a new day.",
      "creator",
    ],
    [
      "noah",
      "Noah Rivers",
      "Sound collector. Slow mornings. Spaces that feel like home.",
      "creator",
    ],
    [
      "admin",
      "Alex Morgan",
      "Helping keep Roomverse kind and welcoming.",
      "admin",
    ],
    [
      "aya",
      "Aya Moreau",
      "A journal, a camera, and a little curiosity.",
      "user",
    ],
    ["leo", "Leo Park", "Building tiny worlds with big feelings.", "creator"],
    ["imani", "Imani Ellis", "Objects, stories, and everyday magic.", "user"],
    [
      "sage",
      "Sage Miller",
      "Here for thoughtful conversations and good music.",
      "user",
    ],
  ];
  const password = await hashPassword(randomBytes(32).toString("hex"));
  const people = names.map(([handle, name, bio, role], i) => ({
    id: `user_${handle}`,
    handle,
    name,
    bio,
    avatar: avatar(i),
    verified: role === "creator",
    role,
    verification: role === "creator" ? "VERIFIED" : "NOT_APPLIED",
    presence: "open",
    settings: defaults(),
    needsConsent: false,
    demo: true,
    createdAt: now(),
  }));
  for (const person of people) {
    store.put("user", person);
    store.db
      .prepare("INSERT OR IGNORE INTO accounts VALUES(?,?,?,NULL)")
      .run(person.id, `${person.handle}@demo.roomverse.local`, password);
    addHome(store, person, true);
  }
  store.link("follow", "user_mika", "user_kira");
  store.link("follow", "user_mika", "user_noah");
  store.link("follow", "user_kira", "user_mika");
  store.link("follow", "user_noah", "user_mika");
  for (const [authorId, caption, variant] of [
    [
      "user_kira",
      "A study in slowing down. Made this between two cups of tea.",
      "sunset",
    ],
    ["user_noah", "Somewhere between ocean air and an old song.", "tide"],
    [
      "user_aya",
      "Collecting small moments, one ordinary afternoon at a time.",
      "bloom",
    ],
    ["user_leo", "A tiny universe from today’s sketchbook.", "orbit"],
  ])
    store.put(
      "post",
      {
        id: id("post_"),
        authorId,
        caption,
        variant,
        mediaUrl: null,
        mediaType: "postcard",
        visibility: "public",
        createdAt: new Date(
          Date.now() - Math.random() * 86400000,
        ).toISOString(),
      },
      authorId,
    );
  const hallSpecs = [
    [
      "user_kira",
      "The softer hours",
      "A collection of light, little rituals, and the places we return to.",
      "sunset",
      "clay",
    ],
    [
      "user_noah",
      "Tidal feelings",
      "An intimate gallery of movement, memory, and the sea.",
      "tide",
      "midnight",
    ],
    [
      "user_leo",
      "Small universes",
      "A playful exploration of color and imagined worlds.",
      "orbit",
      "lavender",
    ],
  ];
  for (const [ownerId, title, description, cover, theme] of hallSpecs) {
    const artworks = [
      "A quiet beginning",
      "Between the lines",
      "Somewhere, softly",
    ].map((title, i) => ({
      id: id("art_"),
      title,
      description:
        "An original study of color, form, and the feeling of being here.",
      medium: i === 1 ? "Digital composition" : "Mixed media",
      year: 2026,
      variant: [cover, "bloom", "orbit"][i],
      url: null,
      alt: title,
      price: null,
      purchaseUrl: null,
    }));
    store.put(
      "hall",
      {
        id: id("hall_"),
        ownerId,
        title,
        description,
        cover,
        theme,
        published: true,
        access: "public",
        live: false,
        spotlightId: artworks[0].id,
        artworks,
        events: [
          {
            id: id("event_"),
            title: "A conversation in the gallery",
            date: new Date(Date.now() + 3 * 86400000).toISOString(),
            rsvps: [],
          },
        ],
        visitors: 0,
      },
      ownerId,
    );
  }
  store.put(
    "notification",
    {
      id: id("notice_"),
      userId: "user_mika",
      title: "Your little world is ready",
      text: "Make it yours. Your room and personal tools are private by default.",
      read: false,
      createdAt: now(),
    },
    "user_mika",
  );
  store.db.prepare("INSERT INTO metadata VALUES(?,?)").run("demo_seeded", "1");
}
