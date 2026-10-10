import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  Home,
  Compass,
  Users,
  DoorOpen,
  Sparkles,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Bell,
  Search,
  LogOut,
  ShieldCheck,
  Palette,
  ChevronRight,
  Leaf,
  Heart,
  LockKeyhole,
  Check,
  Menu,
  X,
  BookOpen,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";
import { Avatar, Button, Modal, Art, request } from "./lib.jsx";
import { RoomPage, ToolsPage, AvatarPage } from "./pages/Room.jsx";
import {
  PeoplePage,
  ProfilePage,
  SettingsPage,
  NotificationsPage,
  SafetyPage,
} from "./pages/Social.jsx";
import { VisitsPage } from "./pages/Visits.jsx";
import { PageBoundary } from "./components/ErrorBoundary.jsx";
import { AdminPage } from "./pages/Creators.jsx";

const links = [
  ["room", "Room", Home],
  ["people", "Friends", Users],
];
const pages = {
  room: RoomPage,
  tools: ToolsPage,
  avatar: AvatarPage,
  people: PeoplePage,
  profile: ProfilePage,
  visits: VisitsPage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  safety: SafetyPage,
  admin: AdminPage,
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>
        roomverse<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function WelcomeArt() {
  return (
    <svg
      viewBox="0 0 600 530"
      className="welcome-art"
      aria-label="An illustrated warm, welcoming little room"
    >
      <defs>
        <linearGradient id="wg" x2="0" y2="1">
          <stop stopColor="#e6eada" />
          <stop offset="1" stopColor="#bccbb2" />
        </linearGradient>
        <pattern id="wp" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 28L28 0" stroke="#ddc3a4" strokeWidth="1" />
        </pattern>
      </defs>
      <circle cx="315" cy="255" r="215" fill="#eae7dc" />
      <path d="M90 265 L315 145 L540 265 L315 402Z" fill="#e0c9aa" />
      <path d="M90 265 L315 145 V315L90 438Z" fill="url(#wg)" />
      <path d="M315 145 L540 265 V438L315 315Z" fill="#f0e8d6" />
      <path
        d="M90 438 L315 315 L540 438 L315 552Z"
        fill="#ead7bb"
        transform="translate(0 -20)"
      />
      <path d="M90 418 L315 295 L540 418 L315 532Z" fill="url(#wp)" />
      <path
        d="M146 258 L257 199 V312L146 370Z"
        fill="#faf2d9"
        stroke="#879c80"
        strokeWidth="8"
      />
      <path d="M157 302L246 254V307L157 352Z" fill="#d89f7d" />
      <path d="M202 225V336M153 286L250 235" stroke="#879c80" strokeWidth="6" />
      <path d="M188 416L318 349L440 413L310 481Z" fill="#b2bea0" />
      <ellipse cx="310" cy="418" rx="80" ry="39" fill="#f1dec6" />
      <path d="M260 335L338 295L437 351L359 390Z" fill="#c9664a" />
      <path d="M260 335V373L359 428V390Z" fill="#dc8062" />
      <path d="M359 390L437 351V392L359 428Z" fill="#b75640" />
      <path d="M257 321L336 281L437 338V359L359 398L257 341Z" fill="#e38f71" />
      <path d="M318 322L350 305L388 326L356 343Z" fill="#f2c09d" />
      <path d="M319 323L319 342L356 363V343Z" fill="#f5caaa" />
      <path d="M394 242L480 287V349L394 304Z" fill="#b89a7c" />
      <path d="M402 256L471 292V327L402 291Z" fill="#44594b" />
      <circle cx="455" cy="305" r="10" fill="#f2d699" />
      <path d="M455 355V400M489 372V419" stroke="#8b7159" strokeWidth="8" />
      <path d="M444 350L490 375L481 390L435 365Z" fill="#b99473" />
      <path
        d="M133 363Q103 306 128 284Q161 300 145 348Q166 311 183 327Q175 358 143 372"
        fill="#607b54"
      />
      <path d="M122 365L152 381L151 414L123 399Z" fill="#d6946e" />
      <path
        d="M472 337Q447 283 472 264Q498 283 484 324Q514 290 527 311Q520 340 484 350"
        fill="#6d8556"
      />
      <path d="M463 338L494 355L493 388L464 372Z" fill="#b57657" />
      <ellipse cx="231" cy="431" rx="25" ry="12" fill="#6c5548" opacity=".14" />
      <path d="M212 411V381Q230 365 248 381V411" fill="#858fab" />
      <path
        d="M218 407L218 432M242 407L242 432"
        stroke="#435064"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="230" cy="355" r="23" fill="#b77957" />
      <path
        d="M207 351Q202 324 229 325Q253 325 255 349Q241 338 232 341Q217 353 207 351Z"
        fill="#353a35"
      />
      <circle cx="222" cy="355" r="2" />
      <circle cx="239" cy="355" r="2" />
      <path
        d="M225 365Q231 369 237 364"
        fill="none"
        stroke="#714732"
        strokeWidth="2"
      />
      <g fill="#e7a17c">
        <path d="M77 190L83 206L99 212L83 218L77 234L71 218L55 212L71 206Z" />
        <path d="M507 152L511 163L522 167L511 171L507 182L503 171L492 167L503 163Z" />
      </g>
      <circle cx="90" cy="343" r="5" fill="#839a78" />
      <circle cx="522" cy="225" r="5" fill="#db8d68" />
    </svg>
  );
}

function Auth({ onAuth, toast, config }) {
  const [mode, setMode] = useState("welcome"),
    [busy, setBusy] = useState(false),
    [googleNotice, setGoogleNotice] = useState(false);
  const [form, setForm] = useState({
    name: "",
    handle: "",
    email: "",
    password: "",
    age: 18,
    consent: false,
  });
  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await request(`/api/auth/${mode === "signup" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      await onAuth();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };
  const demo = async (handle) => {
    setBusy(true);
    try {
      await request("/api/auth/demo", {
        method: "POST",
        body: JSON.stringify({ handle }),
      });
      await onAuth();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-nav">
        <Brand />
        <span className="auth-nav-note">Your room. Your friends.</span>
      </div>
      <div className="auth-content">
        <section className="auth-story">
          <span className="eyebrow">A PLACE OF YOUR OWN</span>
          <h1>
            Your room.
            <br />
            <em>Your people.</em>
          </h1>
          <p>
            Make a space that feels like home. Add friends and invite them in,
            on your terms.
          </p>
          <WelcomeArt />
          <div className="auth-promises">
            <span>
              <LockKeyhole size={16} /> Yours by default
            </span>
            <span>
              <Heart size={16} /> Together by choice
            </span>
            <span>
              <Leaf size={16} /> Beautifully 2D
            </span>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-card-flower">✳︎</div>
          <span className="eyebrow">ROOMVERSE</span>
          <h2>
            {mode === "signup"
              ? "Create your room"
              : mode === "login"
                ? "Welcome back"
                : "Make yourself at home"}
          </h2>
          <p className="muted">
            {mode === "welcome"
              ? "A private room for you and your friends."
              : mode === "signup"
                ? "One account. Your room, your people, your rules."
                : "Your room is just where you left it."}
          </p>
          <button
            className="google-button"
            onClick={() =>
              config.googleEnabled
                ? location.assign("/api/auth/google")
                : setGoogleNotice(true)
            }
          >
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4.2h5.4a4.5 4.5 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.5Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"
              />
              <path
                fill="#EA4335"
                d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
              />
            </svg>
            Continue with Google
          </button>
          {mode === "welcome" ? (
            <>
              <div className="auth-or">
                <span />
                or continue with email
                <span />
              </div>
              <Button onClick={() => setMode("signup")}>
                Create your room <ArrowRight size={17} />
              </Button>
              <p className="auth-switch">
                Already have a room?{" "}
                <button onClick={() => setMode("login")}>Sign in</button>
              </p>
            </>
          ) : (
            <>
              <div className="auth-or">
                <span />
                or with email
                <span />
              </div>
              <form onSubmit={submit} className="stack">
                {mode === "signup" && (
                  <div className="grid-2">
                    <label className="field">
                      Your name
                      <input
                        required
                        maxLength={60}
                        value={form.name}
                        onChange={(e) => field("name", e.target.value)}
                        placeholder="Mika Chen"
                        autoComplete="name"
                      />
                    </label>
                    <label className="field">
                      Username
                      <input
                        required
                        pattern="[A-Za-z0-9_]{3,24}"
                        value={form.handle}
                        onChange={(e) => field("handle", e.target.value)}
                        placeholder="mika"
                        autoComplete="username"
                      />
                    </label>
                  </div>
                )}
                <label className="field">
                  Email
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => field("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  Password
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={form.password}
                    onChange={(e) => field("password", e.target.value)}
                    placeholder={
                      mode === "signup"
                        ? "At least 10 characters"
                        : "Your password"
                    }
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                  />
                </label>
                {mode === "signup" && (
                  <>
                    <label className="field">
                      Age
                      <input
                        type="number"
                        min={18}
                        max={120}
                        required
                        value={form.age}
                        onChange={(e) => field("age", Number(e.target.value))}
                      />
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        required
                        checked={form.consent}
                        onChange={(e) => field("consent", e.target.checked)}
                      />
                      I agree to the privacy and community guidelines. I
                      understand room chat disappears after visits.
                    </label>
                  </>
                )}
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Opening your door…"
                    : mode === "signup"
                      ? "Create your room"
                      : "Sign in"}
                  <ArrowRight size={17} />
                </Button>
              </form>
              <p className="auth-switch">
                {mode === "signup" ? "Already here?" : "New here?"}{" "}
                <button
                  onClick={() =>
                    setMode(mode === "signup" ? "login" : "signup")
                  }
                >
                  {mode === "signup" ? "Sign in" : "Create a room"}
                </button>
              </p>
            </>
          )}
          {config.demoEnabled && (
            <div className="demo-section">
              <span className="eyebrow">TRY THE DEMO</span>
              <div className="demo-accounts">
                <button disabled={busy} onClick={() => demo("mika")}>
                  <span className="demo-color sage">M</span>Personal room
                  <ArrowUpRight size={13} />
                </button>
                <button disabled={busy} onClick={() => demo("kira")}>
                  <span className="demo-color clay">K</span>Friend’s room
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <small>
                Shared demo accounts. Use a new account for private data.
              </small>
            </div>
          )}
          <div className="auth-fine">
            <ShieldCheck size={14} />
            Private spaces. Permission first. Always.
          </div>
        </section>
      </div>
      <footer className="auth-footer">
        <span>Rooms are private by default.</span>
        <div className="row">
          <button onClick={() => setGoogleNotice("privacy")}>
            Privacy & community
          </button>
        </div>
      </footer>
      {googleNotice && (
        <Modal
          title={
            googleNotice === "privacy"
              ? "Privacy & community"
              : "Connect Google sign-in"
          }
          onClose={() => setGoogleNotice(false)}
        >
          {googleNotice === "privacy" ? (
            <div className="stack">
              <p>
                Your journal, tasks, and plans are private by default.
                Friendship alone never grants room or private-content access.
                Private visits require approval from the host and a choice to
                join from the guest.
              </p>
              <p>
                Room chat is temporary. Screenshots and recordings cannot be
                prevented. Reports retain only the details you choose to submit.
                Be kind, respect creative ownership, and use the report or block
                tools when needed.
              </p>
              <p>Roomverse is currently for adults aged 18 or older.</p>
            </div>
          ) : (
            <div className="stack">
              <p>
                Google sign-in isn’t available here yet. You can create an
                account with email or sign in with your password.
              </p>
              <Button
                onClick={() => {
                  setGoogleNotice(false);
                  setMode("signup");
                }}
              >
                Continue with email
                <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

function initialRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const page = Object.hasOwn(pages, parts[0]) ? parts[0] : "room";
  let id = null;
  try {
    id = parts[1] ? decodeURIComponent(parts.slice(1).join("/")) : null;
  } catch {
    /* Invalid links open the room. */
  }
  return { page, id };
}

function FriendSearch({ users, navigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const term = query.trim().replace(/^@/, "").toLowerCase();
  const matches = term
    ? users
        .filter(
          (u) =>
            !u.blocked && `${u.name} ${u.handle}`.toLowerCase().includes(term),
        )
        .slice(0, 6)
    : [];
  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function choose(user) {
    setOpen(false);
    setQuery("");
    setActive(-1);
    navigate("profile", user.id);
  }
  return (
    <div className="friend-search-wrap" ref={ref}>
      <form
        className="global-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (open && active >= 0 && matches[active]) choose(matches[active]);
          else {
            navigate("people", query.trim());
            setOpen(false);
          }
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search friends"
          role="combobox"
          aria-expanded={open && !!term}
          aria-controls="friend-search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `friend-result-${active}` : undefined
          }
          placeholder="Search name or @username"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                matches.length ? (i + 1) % matches.length : -1,
              );
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) =>
                matches.length ? (i <= 0 ? matches.length - 1 : i - 1) : -1,
              );
            }
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActive(-1);
            }}
          >
            <X size={15} />
          </button>
        )}
      </form>
      {open && term && (
        <div
          className="friend-search-results"
          id="friend-search-results"
          role="listbox"
          aria-label="People suggestions"
        >
          {matches.map((u, i) => (
            <button
              type="button"
              id={`friend-result-${i}`}
              role="option"
              aria-selected={i === active}
              key={u.id}
              onClick={() => choose(u)}
              className={active === i ? "selected" : ""}
            >
              <Avatar user={u} size={42} />
              <span>
                <strong>{u.name}</strong>
                <small>@{u.handle}</small>
              </span>
              {u.isFriend && <span className="search-friend-tag">Friend</span>}
            </button>
          ))}
          {!matches.length && <p>No matching people.</p>}
          <button
            className="search-view-all"
            type="button"
            onClick={() => {
              navigate("people", query.trim());
              setOpen(false);
            }}
          >
            Search friends <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState({});
  const [route, setRoute] = useState(initialRoute);
  const [toasts, setToasts] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const timer = useRef(null);
  const refreshSequence = useRef(0);
  const { page, id: selectedId } = route;
  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message: String(message) }]);
    setTimeout(() => setToasts((t) => t.filter((v) => v.id !== id)), 5500);
  }, []);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const next = await request("/api/bootstrap");
      if (sequence === refreshSequence.current) {
        setData(next);
        setError("");
      }
      return next;
    } catch (e) {
      if (e.status === 401) {
        if (sequence === refreshSequence.current) setData(null);
        return null;
      }
      throw e;
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    Promise.all([
      request("/api/config").then((v) => {
        if (mounted) setConfig(v);
      }),
      refresh(),
    ])
      .catch((e) => {
        if (mounted && e.status !== 401) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [refresh]);
  const navigate = useCallback((next, id = null) => {
    const page = Object.hasOwn(pages, next) ? next : "room";
    const route = { page, id: id == null ? null : String(id) };
    setRoute(route);
    history.pushState(
      null,
      "",
      `#/${page}${route.id ? `/${encodeURIComponent(route.id)}` : ""}`,
    );
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  useEffect(() => {
    const change = () => {
      setRoute(initialRoute());
      setMobileNav(false);
    };
    window.addEventListener("popstate", change);
    window.addEventListener("hashchange", change);
    return () => {
      window.removeEventListener("popstate", change);
      window.removeEventListener("hashchange", change);
    };
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!data?.user?.id) return;
    const s = io({ transports: ["websocket", "polling"] });
    setSocket(s);
    const sync = () => refresh().catch((e) => toast(e.message));
    s.on("refresh", () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(sync, 90);
    });
    s.on("connect", sync);
    s.on("session:revoked", () => {
      toast("Your room visit has ended.");
      sync();
    });
    s.on("session:ended", sync);
    return () => {
      clearTimeout(timer.current);
      s.disconnect();
      setSocket(null);
    };
  }, [data?.user?.id, refresh, toast]);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduced-motion",
      Boolean(data?.user?.settings?.reducedMotion),
    );
    document.documentElement.classList.toggle(
      "high-contrast",
      Boolean(data?.user?.settings?.highContrast),
    );
  }, [data?.user?.settings]);
  useEffect(() => {
    if (!mobileNav) return;
    const key = (e) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mobileNav]);
  const act = useCallback(
    async (type, payload = {}) => {
      const result = await request("/api/action", {
        method: "POST",
        body: JSON.stringify({ type, ...payload }),
      });
      await refresh();
      return result;
    },
    [refresh],
  );
  const logout = async () => {
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
      ++refreshSequence.current;
      setData(null);
      navigate("room");
    } catch (e) {
      toast(e.message);
    }
  };
  const complete = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await act("profile.complete", {
        age: Number(form.get("age")),
        consent: true,
      });
      toast("Your room is ready.");
    } catch (e) {
      toast(e.message);
    }
  };
  const toastsView = (
    <div className="toast-region" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.message}</span>
          <button
            onClick={() => setToasts((a) => a.filter((i) => i.id !== t.id))}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-orbit" />
        <p>Opening your room…</p>
      </div>
    );
  if (error)
    return (
      <main className="loading-screen">
        <Brand />
        <h2>Couldn’t connect</h2>
        <p>{error}</p>
        <Button
          onClick={async () => {
            setLoading(true);
            try {
              await refresh();
              setError("");
            } catch (e) {
              setError(e.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          Try again
        </Button>
        {toastsView}
      </main>
    );
  if (!data?.user)
    return (
      <>
        <Auth
          config={config}
          toast={toast}
          onAuth={async () => {
            await refresh();
            navigate("room");
          }}
        />
        {toastsView}
      </>
    );
  const Page = pages[page] || RoomPage;
  const unread = (data.notifications || []).filter((n) => !n.read).length;
  const friendPending = (data.requests || []).filter(
    (r) =>
      r.type === "friend" && r.status === "pending" && r.toId === data.user.id,
  ).length;
  const labels = {
    tools: "Private tools",
    avatar: "Avatar studio",
    visits: "Invites & knocks",
    settings: "Settings",
    profile: "Profile",
    notifications: "Notifications",
    safety: "Safety",
    admin: "Review desk",
  };
  const title = links.find((x) => x[0] === page)?.[1] || labels[page] || "Room";
  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${mobileNav ? "open" : ""}`}
        aria-label="Navigation"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "people" && friendPending > 0 && (
                <b className="nav-count">{friendPending}</b>
              )}
              {page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <nav className="primary-nav" aria-label="Your room tools">
          <button
            className={`nav-item ${page === "tools" ? "active" : ""}`}
            onClick={() => navigate("tools")}
          >
            <BookOpen size={20} />
            <span>Private tools</span>
            <LockKeyhole size={13} className="nav-small" />
          </button>
          <button
            className={`nav-item ${page === "avatar" ? "active" : ""}`}
            onClick={() => navigate("avatar")}
          >
            <Palette size={20} />
            <span>Avatar studio</span>
          </button>
          {data.user.role === "admin" && (
            <button
              className={`nav-item ${page === "admin" ? "active" : ""}`}
              onClick={() => navigate("admin")}
            >
              <ShieldCheck size={20} />
              <span>Review desk</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <div className="sidebar-profile">
            <button onClick={() => navigate("profile", data.user.id)}>
              <Avatar user={data.user} size={42} />
              <span>
                <strong>{data.user.name}</strong>
                <small>@{data.user.handle}</small>
              </span>
            </button>
            <button
              className="icon-button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <div className="nav-overlay" onClick={() => setMobileNav(false)} />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span className="topbar-breadcrumb">
              <strong>{title}</strong>
            </span>
          </div>
          <FriendSearch
            users={(data.users || []).filter((u) => u.id !== data.user.id)}
            navigate={navigate}
          />
          <div className="topbar-actions">
            <button
              className="topbar-notification icon-button"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={20} />
              {unread > 0 && <span />}
            </button>
            <button
              className="profile-top"
              aria-label="Your profile"
              onClick={() => navigate("profile", data.user.id)}
            >
              <Avatar user={data.user} size={36} />
            </button>
          </div>
        </header>
        {!online && (
          <div className="connection-banner">
            You’re offline. Reconnect to save changes.
          </div>
        )}
        <main className="workspace-content" id="main-content">
          <div className="page-content">
            <PageBoundary
              key={`${page}:${selectedId || ""}`}
              onRecover={async () => {
                await refresh();
                navigate("room");
              }}
            >
              <Page
                key={`${page}:${selectedId || ""}`}
                data={data}
                act={act}
                refresh={refresh}
                navigate={navigate}
                toast={toast}
                selectedId={selectedId}
                socket={socket}
                config={config}
              />
            </PageBoundary>
          </div>
        </main>
      </div>
      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {links.map(([id, label, Icon]) => (
          <button
            className={page === id ? "active" : ""}
            aria-current={page === id ? "page" : undefined}
            key={id}
            onClick={() => navigate(id)}
          >
            <Icon size={23} />
            <span>{label}</span>
            {id === "people" && friendPending > 0 && (
              <i className="mobile-nav-count">{friendPending}</i>
            )}
          </button>
        ))}
        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => navigate("profile", data.user.id)}
        >
          <Avatar user={data.user} size={26} />
          <span>Me</span>
        </button>
      </nav>
      {toastsView}
      {data.user.needsConsent && (
        <Modal
          title="Activate your room"
          onClose={() => toast("Confirm your age and consent to continue.")}
        >
          <form className="stack" onSubmit={complete}>
            <p>Confirm your age and consent to activate your Google account.</p>
            <label className="field">
              Your age
              <input type="number" min={18} max={120} name="age" required />
            </label>
            <label className="check-label">
              <input type="checkbox" required />I agree to the community and
              privacy guidelines. Room chat is temporary.
            </label>
            <Button type="submit">
              Open my room
              <ArrowRight size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
