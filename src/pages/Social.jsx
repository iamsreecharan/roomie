import React, { useEffect, useRef, useState } from "react";
import {
  Heart,
  Bookmark,
  MoreHorizontal,
  Plus,
  ImagePlus,
  Video,
  Send,
  X,
  Users,
  Search,
  DoorOpen,
  ShieldCheck,
  Check,
  ArrowUpRight,
  Bell,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Clock,
  MessageCircle,
  Lock,
  Shield,
  Download,
  Trash2,
  Flag,
  Volume2,
  Monitor,
  Hand,
  Sparkles,
  SlidersHorizontal,
  Settings,
  LogOut,
  CircleCheck,
  Mail,
  ChevronRight,
  Globe,
  Palette,
  FileText,
} from "lucide-react";
import { Avatar, Button, Modal, Empty, Art, timeAgo, Badge } from "../lib.jsx";
import { MediaCall } from "../components/MediaCall.jsx";
import RoomScene from "../components/RoomScene.jsx";
import "./social.css";

const reasons = ["Hang out?", "Can we talk?", "Create together?"];
const rights = ["chat", "voice", "screen", "interact", "invite"];
const rightLabels = {
  chat: "Text chat",
  voice: "Voice & video",
  screen: "Screen sharing",
  interact: "Room interaction",
  invite: "Invite friends",
};
const defaultRights = {
  chat: true,
  voice: false,
  screen: false,
  interact: false,
  invite: false,
};
const userById = (data, id) =>
  id === data.user?.id ? data.user : data.users?.find((u) => u.id === id);
const run = async (act, toast, type, payload = {}, success) => {
  try {
    const result = await act(type, payload);
    if (success) toast(success);
    return result;
  } catch (err) {
    toast(err.message || "Something went wrong. Please try again.");
    return null;
  }
};
function PersonName({ user }) {
  return (
    <span className="social-person-name">
      {user?.name || "Roomverse member"}
      {user?.verified && (
        <ShieldCheck
          size={15}
          aria-label="Verified creator"
          className="social-verified"
        />
      )}
    </span>
  );
}
function Heading({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading social-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
function ReportModal({ targetType, targetId, onClose, act, toast }) {
  const [reason, setReason] = useState("Harassment or bullying");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Tell us what happened" onClose={onClose}>
      <p className="muted">
        Your report is private. Include what will help a moderator understand
        the situation.
      </p>
      <label className="field">
        Reason
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {[
            "Harassment or bullying",
            "Inappropriate content",
            "Impersonation",
            "Spam or scam",
            "Privacy concern",
            "Something else",
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Details
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Add context (optional)"
        />
      </label>
      <div className="social-modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await run(
              act,
              toast,
              "report.create",
              { targetType, targetId, reason, details },
              "Report submitted. Thank you for helping keep this space safe.",
            );
            setBusy(false);
            if (result) onClose();
          }}
        >
          <Flag size={16} />
          {busy ? "Sending…" : "Submit report"}
        </Button>
      </div>
    </Modal>
  );
}
function KnockModal({ person, onClose, act, toast }) {
  const [reason, setReason] = useState(reasons[0]);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="A little knock on their door" onClose={onClose}>
      <div className="social-knock-person">
        <Avatar user={person} size={74} />
        <div>
          <PersonName user={person} />
          <p className="muted">@{person.handle}</p>
        </div>
      </div>
      <p className="muted">
        They choose whether to welcome you in, and which permissions to share.
      </p>
      <div className="social-reasons">
        {reasons.map((r) => (
          <button
            key={r}
            className={`social-reason ${reason === r ? "active" : ""}`}
            onClick={() => setReason(r)}
          >
            {r === reasons[0] ? (
              <DoorOpen size={21} />
            ) : r === reasons[1] ? (
              <MessageCircle size={21} />
            ) : (
              <Palette size={21} />
            )}
            {r}
            {reason === r && <Check size={16} />}
          </button>
        ))}
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await run(
            act,
            toast,
            "knock.create",
            { userId: person.id, reason },
            "Knock sent. They’ll decide when to welcome you.",
          );
          setBusy(false);
          if (result) onClose();
        }}
      >
        <DoorOpen size={17} />
        {busy ? "Sending…" : "Send a knock"}
      </Button>
    </Modal>
  );
}

function ContactMatching({ data, act, toast, navigate, onClose }) {
  const [emails, setEmails] = useState(""),
    [consent, setConsent] = useState(!!data.user.settings?.contactSync),
    [matches, setMatches] = useState(null),
    [busy, setBusy] = useState(false);
  const addresses = [
    ...new Set(
      emails
        .split(/[\s,;]+/)
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  useEffect(() => {
    if (data.user.settings?.contactSync === false) setMatches(null);
  }, [data.user.settings?.contactSync]);
  const find = async () => {
    if (!addresses.length) return toast("Add at least one email address.");
    if (addresses.length > 500)
      return toast("You can check up to 500 email addresses at a time.");
    if (addresses.some((v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))
      return toast("One of these email addresses doesn’t look complete.");
    setBusy(true);
    try {
      if (!data.user.settings?.contactSync)
        await act("settings.update", { settings: { contactSync: true } });
      const result = await act("contacts.match", { emails: addresses });
      setMatches(result.matches || []);
      setEmails("");
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="A familiar face in the neighborhood" onClose={onClose}>
      <div className="social-contact-intro">
        <Users size={27} />
        <p>
          Find people you already know, if they’ve also chosen to be
          discoverable through contacts.
        </p>
      </div>
      <p className="muted">
        Paste email addresses to check. We don’t access your phone contacts or
        social accounts, and this list isn’t saved as an address book.
      </p>
      {matches === null ? (
        <>
          <label className="field">
            Email addresses
            <textarea
              rows={5}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"friend@example.com\nanother@example.com"}
            />
          </label>
          <span className="social-contact-count">
            {addresses.length}/500 addresses
          </span>
          <label className="social-contact-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I choose to enable contact discovery and check these addresses.
              Other people can also find me this way when their contacts match.
            </span>
          </label>
          <Button
            disabled={!consent || busy || !addresses.length}
            onClick={find}
          >
            <Search size={16} />
            {busy ? "Looking for familiar faces…" : "Find people I know"}
          </Button>
        </>
      ) : (
        <>
          <h3 className="social-contact-results-title">
            {matches.length
              ? `${matches.length} familiar ${matches.length === 1 ? "face" : "faces"}`
              : "No matches right now"}
          </h3>
          {matches.length ? (
            <div className="social-contact-results">
              {matches.map((match) => {
                const person = userById(data, match.id) || match;
                return (
                  <div key={person.id}>
                    <button
                      className="social-person-button"
                      onClick={() => {
                        onClose();
                        navigate("profile", person.id);
                      }}
                    >
                      <Avatar user={person} size={44} />
                      <span>
                        <PersonName user={person} />
                        <small>@{person.handle}</small>
                      </span>
                    </button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(act, toast, "follow.toggle", { userId: person.id })
                      }
                    >
                      {person.following ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {person.following ? "Following" : "Follow"}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">
              Only people who have opted in appear here. Matching doesn’t reveal
              whether an email has an account.
            </p>
          )}
          <Button variant="secondary" onClick={() => setMatches(null)}>
            Check another list
          </Button>
        </>
      )}
      <div className="social-contact-footer">
        <Lock size={14} />
        <span>You can turn contact discovery off any time.</span>
        {data.user.settings?.contactSync && (
          <button
            className="social-text-button"
            onClick={async () => {
              const result = await run(
                act,
                toast,
                "settings.update",
                { settings: { contactSync: false } },
                "Contact discovery is off",
              );
              if (result) {
                setConsent(false);
                setMatches(null);
                setEmails("");
              }
            }}
          >
            Turn off
          </button>
        )}
      </div>
    </Modal>
  );
}

function PostMedia({ post }) {
  if (post.mediaUrl)
    return post.mediaType === "video" ? (
      <video
        className="social-post-media"
        src={post.mediaUrl}
        controls
        playsInline
        preload="metadata"
      />
    ) : (
      <img
        className="social-post-media"
        src={post.mediaUrl}
        alt={post.caption || "Shared photo"}
        loading="lazy"
      />
    );
  return (
    <div
      className={`social-postcard social-postcard-${post.variant || "sunset"}`}
    >
      <Art variant={post.variant || "sunset"} />
      <div className="social-postcard-label">
        <span>A LITTLE MOMENT</span>
        <strong>
          {post.caption?.length > 150
            ? `${post.caption.slice(0, 147)}…`
            : post.caption || "A world of your own."}
        </strong>
        <span>ROOMVERSE POSTCARDS</span>
      </div>
    </div>
  );
}
function ComposeModal({ onClose, data, act, toast }) {
  const [caption, setCaption] = useState("");
  const [variant, setVariant] = useState("sunset");
  const [visibility, setVisibility] = useState("public");
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = file.type.startsWith("video/") ? "video" : "photo";
    if (!(file.type.startsWith("image/") || file.type.startsWith("video/")))
      return toast("Choose an image or video.");
    if (file.size > (kind === "video" ? 20 : 8) * 1024 * 1024)
      return toast(
        kind === "video"
          ? "Choose a video smaller than 20 MB."
          : "Choose an image smaller than 8 MB.",
      );
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, name: file.name, kind }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setMedia({ url: result.url, kind, name: file.name });
    } catch (err) {
      toast(err.message || "Could not upload this file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const post = {
    caption,
    variant,
    mediaUrl: media?.url,
    mediaType: media?.kind || "postcard",
  };
  return (
    <Modal
      title={
        preview
          ? "Your moment, before you share"
          : "Share a little of your world"
      }
      onClose={onClose}
      wide
    >
      <div className="social-compose-grid">
        <div className="social-compose-form">
          <div className="row">
            <Avatar user={data.user} size={45} />
            <div>
              <PersonName user={data.user} />
              <p className="muted">A postcard from your room</p>
            </div>
          </div>
          <label className="field">
            Your moment
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={1500}
              placeholder="What’s inspiring you today?"
            />
          </label>
          <div className="social-caption-count">{caption.length}/1500</div>
          <label className="field">
            Who can see this?
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="public">Everyone</option>
              <option value="followers">Your followers</option>
              <option value="close-friends">Close friends</option>
            </select>
          </label>
          <p className="social-privacy-note">
            <Lock size={14} />
            Close friends are chosen on each member’s profile. Only they can see
            these moments.
          </p>
          {!media && (
            <div>
              <span className="social-field-label">Choose a postcard</span>
              <div className="social-art-options">
                {["sunset", "bloom", "tide", "orbit"].map((v) => (
                  <button
                    aria-label={`${v} postcard`}
                    key={v}
                    className={variant === v ? "selected" : ""}
                    onClick={() => setVariant(v)}
                  >
                    <Art variant={v} />
                    {variant === v && (
                      <span>
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            hidden
            onChange={upload}
          />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={17} />
            {busy
              ? "Uploading…"
              : media
                ? "Change photo or video"
                : "Add a photo or video"}
          </Button>
          {media && (
            <button
              className="social-text-button"
              onClick={() => setMedia(null)}
            >
              <X size={14} />
              Remove {media.name}
            </button>
          )}
        </div>
        <div className="social-compose-preview">
          <PostMedia post={post} />
          <span className="social-preview-label">
            {visibility === "public" ? <Globe size={13} /> : <Lock size={13} />}
            {visibility === "public"
              ? "Public moment"
              : visibility === "followers"
                ? "Followers only"
                : "Close friends only"}
          </span>
        </div>
      </div>
      <div className="social-modal-actions">
        <Button variant="secondary" onClick={() => setPreview((p) => !p)}>
          <Eye size={16} />
          {preview ? "Keep editing" : "Preview"}
        </Button>
        <Button
          disabled={busy || (!caption.trim() && !media)}
          onClick={async () => {
            setBusy(true);
            const result = await run(
              act,
              toast,
              "post.create",
              { ...post, visibility },
              "Your moment is out in the world.",
            );
            setBusy(false);
            if (result) onClose();
          }}
        >
          <Send size={16} />
          Share moment
        </Button>
      </div>
    </Modal>
  );
}

export function FeedPage({ data, act, navigate, toast }) {
  const [tab, setTab] = useState("discover");
  const [compose, setCompose] = useState(false);
  const [menu, setMenu] = useState(null);
  const [report, setReport] = useState(null);
  const [query, setQuery] = useState("");
  const users = data.users || [];
  const posts = (data.posts || []).filter((p) => {
    const author = userById(data, p.authorId);
    return (
      (tab !== "following" ||
        p.authorId === data.user.id ||
        author?.following) &&
      (tab !== "saved" || p.saved) &&
      (!query ||
        `${p.caption} ${author?.name || ""} ${author?.handle || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()))
    );
  });
  return (
    <div className="social-page">
      <Heading
        eyebrow="THE NEIGHBORHOOD"
        title="Little moments. Real connections."
        text="A window into the worlds around you."
      >
        <Button onClick={() => setCompose(true)}>
          <Plus size={17} />
          Share a moment
        </Button>
      </Heading>
      <div className="social-feed-layout">
        <div>
          <div className="social-feed-toolbar">
            <div className="tabs">
              {[
                ["discover", "Discover"],
                ["following", "Following"],
                ["saved", "Saved"],
              ].map(([id, text]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {text}
                </button>
              ))}
            </div>
            <label className="social-search">
              <Search size={17} />
              <input
                aria-label="Search moments"
                placeholder="Find a moment…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="social-feed-grid">
            {posts.map((post) => {
              const author = userById(data, post.authorId);
              return (
                <article className="card social-post" key={post.id}>
                  <div className="social-post-header">
                    <button
                      className="social-person-button"
                      onClick={() => navigate("profile", post.authorId)}
                    >
                      <Avatar user={author} size={42} />
                      <span>
                        <PersonName user={author} />
                        <small>
                          {timeAgo(post.createdAt)} ·{" "}
                          {post.visibility === "public"
                            ? "Everyone"
                            : post.visibility === "followers"
                              ? "Followers"
                              : "Close friends"}
                        </small>
                      </span>
                    </button>
                    <div className="social-dropdown-anchor">
                      <button
                        className="icon-button"
                        aria-label="Post options"
                        onClick={() =>
                          setMenu(menu === post.id ? null : post.id)
                        }
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menu === post.id && (
                        <div className="social-dropdown">
                          <button
                            onClick={() => {
                              run(act, toast, "post.save", { postId: post.id });
                              setMenu(null);
                            }}
                          >
                            <Bookmark size={15} />
                            {post.saved ? "Remove bookmark" : "Save moment"}
                          </button>
                          {post.authorId === data.user.id ? (
                            <button
                              onClick={() => {
                                run(
                                  act,
                                  toast,
                                  "post.delete",
                                  { postId: post.id },
                                  "Moment deleted",
                                );
                                setMenu(null);
                              }}
                            >
                              <Trash2 size={15} />
                              Delete moment
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  run(
                                    act,
                                    toast,
                                    "post.hide",
                                    { postId: post.id },
                                    "Moment hidden",
                                  );
                                  setMenu(null);
                                }}
                              >
                                <EyeOff size={15} />
                                Hide moment
                              </button>
                              <button
                                onClick={() => {
                                  setReport(post.id);
                                  setMenu(null);
                                }}
                              >
                                <Flag size={15} />
                                Report moment
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <PostMedia post={post} />
                  <div className="social-post-body">
                    {(post.mediaUrl || post.caption?.length > 150) && (
                      <p className="social-post-caption">{post.caption}</p>
                    )}
                    <div className="social-post-footer">
                      <button
                        aria-label={
                          post.liked ? "Unlike moment" : "Like moment"
                        }
                        className={`social-like ${post.liked ? "active" : ""}`}
                        onClick={() =>
                          run(act, toast, "post.like", { postId: post.id })
                        }
                      >
                        <Heart
                          size={19}
                          fill={post.liked ? "currentColor" : "none"}
                        />
                        <span>{post.likes || 0}</span>
                      </button>
                      <span className="social-post-kind">
                        {post.mediaType === "video" ? (
                          <Video size={14} />
                        ) : post.mediaType === "photo" ? (
                          <ImagePlus size={14} />
                        ) : (
                          <Mail size={14} />
                        )}
                        {post.mediaType === "postcard"
                          ? "Room postcard"
                          : "Shared moment"}
                      </span>
                      <button
                        className={`icon-button ${post.saved ? "social-saved" : ""}`}
                        aria-label={
                          post.saved ? "Unsave moment" : "Save moment"
                        }
                        onClick={() =>
                          run(act, toast, "post.save", { postId: post.id })
                        }
                      >
                        <Bookmark
                          size={19}
                          fill={post.saved ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!posts.length && (
            <Empty
              icon={tab === "saved" ? Bookmark : Heart}
              title={
                query
                  ? "No moments found"
                  : tab === "following"
                    ? "Start with a familiar face"
                    : tab === "saved"
                      ? "Keep a moment close"
                      : "Your first moment starts here"
              }
            >
              {query ? (
                "Try another word or name."
              ) : tab === "following" ? (
                <>
                  <p>Follow people to see their little moments here.</p>
                  <Button onClick={() => navigate("people")}>
                    Meet your neighbors
                  </Button>
                </>
              ) : tab === "saved" ? (
                "Tap the bookmark on a moment to revisit it here."
              ) : (
                <Button onClick={() => setCompose(true)}>
                  Create a postcard
                </Button>
              )}
            </Empty>
          )}
        </div>
        <aside className="social-feed-aside">
          <div className="social-neighborhood-note">
            <div className="social-note-icon">
              <Sparkles size={23} />
            </div>
            <div className="eyebrow">MADE FOR YOUR PACE</div>
            <h3>
              A little less noise.
              <br />A little more you.
            </h3>
            <p>
              No comment threads. No pressure. Just share what feels like home.
            </p>
          </div>
          <div className="card social-suggestions">
            <div className="section-title">
              <h3>Meet the neighbors</h3>
              <Users size={17} />
            </div>
            {users
              .filter(
                (u) => !u.following && !u.blocked && u.id !== data.user.id,
              )
              .slice(0, 3)
              .map((u) => (
                <div className="social-suggest-person" key={u.id}>
                  <button
                    className="social-person-button"
                    onClick={() => navigate("profile", u.id)}
                  >
                    <Avatar user={u} size={42} />
                    <span>
                      <PersonName user={u} />
                      <small>@{u.handle}</small>
                    </span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Follow ${u.name}`}
                    onClick={() =>
                      run(act, toast, "follow.toggle", { userId: u.id })
                    }
                  >
                    <UserPlus size={17} />
                  </button>
                </div>
              ))}
            <button
              className="social-text-button"
              onClick={() => navigate("people")}
            >
              Explore people <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="social-footer-links">
            <button onClick={() => navigate("safety")}>Safety & privacy</button>
            <button onClick={() => navigate("settings")}>
              Your preferences
            </button>
            <span>ROOMVERSE · A PLACE TO BE YOU</span>
          </div>
        </aside>
      </div>
      {compose && (
        <ComposeModal
          data={data}
          act={act}
          toast={toast}
          onClose={() => setCompose(false)}
        />
      )}
      {report && (
        <ReportModal
          targetType="post"
          targetId={report}
          act={act}
          toast={toast}
          onClose={() => setReport(null)}
        />
      )}
    </div>
  );
}

export function PeoplePage({ data, act, navigate, toast, selectedId }) {
  const [query, setQuery] = useState(selectedId || "");
  useEffect(() => {
    setQuery(selectedId || "");
  }, [selectedId]);
  const [tab, setTab] = useState("everyone");
  const [knock, setKnock] = useState(null);
  const [contacts, setContacts] = useState(false);
  const people = (data.users || []).filter(
    (u) =>
      u.id !== data.user.id &&
      !u.blocked &&
      (tab !== "following" || u.following) &&
      (tab !== "creators" || u.verified) &&
      `${u.name} ${u.handle} ${u.bio || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="social-page">
      <Heading
        eyebrow="GOOD COMPANY"
        title="Find your kind of people."
        text="Every room has a story. Get to know the person behind the door."
      >
        <Button variant="secondary" onClick={() => setContacts(true)}>
          <Users size={16} />
          Find people you know
        </Button>
      </Heading>
      <div className="social-people-toolbar">
        <label className="social-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, handles, or a shared interest"
            aria-label="Search people"
          />
        </label>
        <div className="tabs">
          {[
            ["everyone", "Everyone"],
            ["following", "Following"],
            ["creators", "Creators"],
          ].map(([id, title]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      <div className="social-people-grid">
        {people.map((person, index) => (
          <article className="card social-person-card" key={person.id}>
            <div className={`social-person-cover social-cover-${index % 4}`}>
              <Art variant={["bloom", "tide", "sunset", "orbit"][index % 4]} />
              <button
                className={`social-follow ${person.following ? "following" : ""}`}
                onClick={() =>
                  run(act, toast, "follow.toggle", { userId: person.id })
                }
              >
                {person.following ? <Check size={15} /> : <Plus size={15} />}
                {person.following ? "Following" : "Follow"}
              </button>
            </div>
            <button
              className="social-profile-avatar"
              onClick={() => navigate("profile", person.id)}
              aria-label={`Visit ${person.name}'s profile`}
            >
              <Avatar user={person} size={94} />
            </button>
            <div className="social-person-card-body">
              <button
                className="social-name-link"
                onClick={() => navigate("profile", person.id)}
              >
                <PersonName user={person} />
              </button>
              <span className="muted">@{person.handle}</span>
              <p>{person.bio || "Making a little world of their own."}</p>
              <div className="social-person-bottom">
                <span className="social-presence">
                  <i
                    className={
                      ["open", "available"].includes(person.presence)
                        ? "online"
                        : ""
                    }
                  />
                  {["open", "available"].includes(person.presence)
                    ? "Around today"
                    : ["focused", "busy"].includes(person.presence)
                      ? "In their own world"
                      : "At their own pace"}
                </span>
                <Button variant="secondary" onClick={() => setKnock(person)}>
                  <DoorOpen size={16} />
                  Knock
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!people.length && (
        <Empty icon={Users} title="No neighbors here yet">
          {query
            ? "Try another name or interest."
            : "Meet someone in Discover, or invite a friend to make a room of their own."}
        </Empty>
      )}
      {contacts && (
        <ContactMatching
          data={data}
          act={act}
          toast={toast}
          navigate={navigate}
          onClose={() => setContacts(false)}
        />
      )}
      {knock && (
        <KnockModal
          person={knock}
          act={act}
          toast={toast}
          onClose={() => setKnock(null)}
        />
      )}
    </div>
  );
}

function EditProfile({ user, act, toast, onClose }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [presence, setPresence] = useState(user.presence || "open");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Make it feel like you" onClose={onClose}>
      <label className="field">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </label>
      <label className="field">
        A little about you
        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          placeholder="What makes your world yours?"
        />
      </label>
      <label className="field">
        Your current pace
        <select value={presence} onChange={(e) => setPresence(e.target.value)}>
          <option value="open">Around today</option>
          <option value="focused">In my own world</option>
          <option value="away">At my own pace</option>
        </select>
      </label>
      <Button
        disabled={busy || !name.trim()}
        onClick={async () => {
          setBusy(true);
          const r = await run(
            act,
            toast,
            "profile.update",
            { name, bio, presence },
            "Profile updated",
          );
          setBusy(false);
          if (r) onClose();
        }}
      >
        Save profile
      </Button>
    </Modal>
  );
}
function VerificationModal({ user, act, toast, onClose }) {
  const [name, setName] = useState(user.name);
  const [website, setWebsite] = useState("");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="A home for your creative work" onClose={onClose}>
      <div className="social-verification-intro">
        <ShieldCheck size={28} />
        <p>
          Apply for a creator profile to publish an exhibition hall. A moderator
          will review your work.
        </p>
      </div>
      <label className="field">
        Your real or professional name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="field">
        Portfolio or website
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://your-portfolio.com"
        />
      </label>
      <label className="field">
        Tell us about your work
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What do you make, and what would you like to exhibit?"
        />
      </label>
      <Button
        disabled={busy || !name.trim() || !statement.trim()}
        onClick={async () => {
          setBusy(true);
          const r = await run(
            act,
            toast,
            "verification.apply",
            { name, website, statement },
            "Your application is ready for review.",
          );
          setBusy(false);
          if (r) onClose();
        }}
      >
        Submit application <ArrowUpRight size={16} />
      </Button>
    </Modal>
  );
}
export function ProfilePage({
  data,
  selectedId,
  act,
  navigate,
  toast,
  config = {},
}) {
  const person = userById(data, selectedId || data.user.id);
  const own = !selectedId || selectedId === data.user.id;
  const [edit, setEdit] = useState(false);
  const [verification, setVerification] = useState(false);
  const [knock, setKnock] = useState(false);
  const [report, setReport] = useState(false);
  const [tab, setTab] = useState("moments");
  if (!person)
    return (
      <Empty icon={Users} title="This profile is unavailable">
        <Button onClick={() => navigate("people")}>Explore people</Button>
      </Empty>
    );
  const posts = (data.posts || []).filter((p) => p.authorId === person.id);
  const halls = (data.halls || []).filter(
    (h) => h.ownerId === person.id && h.published,
  );
  return (
    <div className="social-page">
      <div className="social-profile-cover">
        <Art variant="tide" />
        <div className="social-profile-cover-copy">
          <span>A WORLD OF THEIR OWN</span>
          <p>
            {own
              ? "Your corner of the universe."
              : "A little world. A whole person."}
          </p>
        </div>
        {own && (
          <Button variant="secondary" onClick={() => navigate("avatar")}>
            <Palette size={16} />
            Style your avatar
          </Button>
        )}
      </div>
      <div className="social-profile-overview">
        <Avatar user={person} size={132} />
        <div className="social-profile-copy">
          <h1>
            <PersonName user={person} />
          </h1>
          <p className="muted">@{person.handle}</p>
          <p>{person.bio || "Making a little world of their own."}</p>
          <div className="social-profile-stats">
            <span>
              <strong>
                {person.followers ||
                  (data.users || []).find((u) => u.id === person.id)
                    ?.followers ||
                  0}
              </strong>{" "}
              followers
            </span>
            <span>
              <strong>{posts.length}</strong> moments
            </span>
            {person.verified && <Badge tone="green">Verified creator</Badge>}
          </div>
        </div>
        <div className="social-profile-actions">
          {own ? (
            <>
              <Button variant="secondary" onClick={() => setEdit(true)}>
                Edit profile
              </Button>
              <Button onClick={() => navigate("room")}>
                <DoorOpen size={16} />
                Go to my room
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  run(act, toast, "follow.toggle", { userId: person.id })
                }
              >
                {person.following ? (
                  <Check size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                {person.following ? "Following" : "Follow"}
              </Button>
              <Button disabled={person.blocked} onClick={() => setKnock(true)}>
                <DoorOpen size={16} />
                Knock on door
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="social-profile-layout">
        <div>
          <div className="tabs">
            {[
              ["moments", "Moments"],
              ["halls", "Exhibition halls"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "moments" ? (
            <div className="social-profile-moments">
              {posts.map((post) => (
                <article className="card social-profile-post" key={post.id}>
                  <PostMedia post={post} />
                  {(post.mediaUrl || post.caption?.length > 150) && (
                    <p>{post.caption}</p>
                  )}
                  <div className="social-mini-post-footer">
                    <button
                      onClick={() =>
                        run(act, toast, "post.like", { postId: post.id })
                      }
                      className={post.liked ? "social-liked" : ""}
                    >
                      <Heart
                        size={17}
                        fill={post.liked ? "currentColor" : "none"}
                      />
                      {post.likes || 0}
                    </button>
                    <small>{timeAgo(post.createdAt)}</small>
                    <button
                      aria-label="Save moment"
                      onClick={() =>
                        run(act, toast, "post.save", { postId: post.id })
                      }
                    >
                      <Bookmark
                        size={17}
                        fill={post.saved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </article>
              ))}
              {!posts.length && (
                <Empty icon={Mail} title="A story still unfolding">
                  {own ? (
                    <Button onClick={() => navigate("feed")}>
                      Share your first moment
                    </Button>
                  ) : (
                    "Their moments will appear here when they share."
                  )}
                </Empty>
              )}
            </div>
          ) : (
            <div className="social-profile-halls">
              {halls.map((hall) => (
                <button
                  key={hall.id}
                  className="card social-profile-hall"
                  onClick={() => navigate("hall", hall.id)}
                >
                  <Art variant={hall.cover} />
                  <div>
                    <h3>{hall.title}</h3>
                    <p className="muted">{hall.description}</p>
                    <span>
                      Explore exhibition <ArrowUpRight size={15} />
                    </span>
                  </div>
                </button>
              ))}
              {!halls.length && (
                <Empty icon={Palette} title="No exhibitions yet">
                  {own && person.verified ? (
                    <Button onClick={() => navigate("creator")}>
                      Create an exhibition
                    </Button>
                  ) : (
                    "Exhibitions appear here when a creator publishes them."
                  )}
                </Empty>
              )}
            </div>
          )}
        </div>
        <aside className="stack">
          {own ? (
            <>
              <div className="card social-profile-note">
                <ShieldCheck size={25} />
                <h3>
                  {person.verified
                    ? "Your creative home is ready"
                    : person.verification === "PENDING_REVIEW"
                      ? "Your application is in review"
                      : "Bring your work into the world"}
                </h3>
                <p>
                  {person.verified
                    ? "Design a hall, hang your work, and welcome an audience."
                    : person.verification === "PENDING_REVIEW"
                      ? "You’ll receive a notification when a moderator has reviewed your application."
                      : "Verified creators can build exhibition halls and host live walkthroughs."}
                </p>
                {person.verified ? (
                  <Button
                    variant="secondary"
                    onClick={() => navigate("creator")}
                  >
                    Creator studio <ArrowUpRight size={15} />
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={person.verification === "PENDING_REVIEW"}
                    onClick={() => setVerification(true)}
                  >
                    Apply for verification
                  </Button>
                )}
              </div>
              <div className="card social-profile-note">
                <Lock size={24} />
                <h3>Your world, your boundaries</h3>
                <p>
                  Choose who can knock, what you share, and how you show up.
                </p>
                <Button variant="ghost" onClick={() => navigate("settings")}>
                  Privacy settings <ChevronRight size={16} />
                </Button>
                <Button variant="ghost" onClick={() => navigate("safety")}>
                  Account data & safety <ChevronRight size={16} />
                </Button>
                {config.googleEnabled && (
                  <Button
                    variant="ghost"
                    disabled={data.user.googleLinked}
                    onClick={() => window.location.assign("/api/auth/google")}
                  >
                    {data.user.googleLinked ? (
                      <CircleCheck size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                    {data.user.googleLinked
                      ? "Google connected"
                      : "Connect Google"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="card social-profile-note">
              <Shield size={24} />
              <h3>Good company starts with respect</h3>
              <p>
                Visits are always by permission. Private room objects stay
                private until their owner shares them.
              </p>
              <button
                className="social-text-button"
                onClick={() =>
                  run(
                    act,
                    toast,
                    "closefriend.toggle",
                    { userId: person.id },
                    person.closeFriend
                      ? "Removed from close friends"
                      : "Added to close friends. They can see your close-friends moments.",
                  )
                }
              >
                <Heart
                  size={15}
                  fill={person.closeFriend ? "currentColor" : "none"}
                />
                {person.closeFriend
                  ? "Remove from close friends"
                  : "Add to close friends"}
              </button>
              <button
                className="social-text-button"
                onClick={() => setReport(true)}
              >
                <Flag size={15} />
                Report this profile
              </button>
              <button
                className="social-text-button"
                onClick={() =>
                  run(
                    act,
                    toast,
                    "block.toggle",
                    { userId: person.id },
                    person.blocked
                      ? "Member unblocked"
                      : "Member blocked. They can no longer contact you.",
                  )
                }
              >
                <Shield size={15} />
                {person.blocked ? "Unblock member" : "Block member"}
              </button>
            </div>
          )}
        </aside>
      </div>
      {edit && (
        <EditProfile
          user={person}
          act={act}
          toast={toast}
          onClose={() => setEdit(false)}
        />
      )}
      {verification && (
        <VerificationModal
          user={person}
          act={act}
          toast={toast}
          onClose={() => setVerification(false)}
        />
      )}
      {knock && (
        <KnockModal
          person={person}
          act={act}
          toast={toast}
          onClose={() => setKnock(false)}
        />
      )}
      {report && (
        <ReportModal
          targetType="user"
          targetId={person.id}
          act={act}
          toast={toast}
          onClose={() => setReport(false)}
        />
      )}
    </div>
  );
}

function Toggle({ label, description, value, onChange, icon: Icon }) {
  return (
    <div className="social-setting-row">
      <div className="social-setting-icon">{Icon && <Icon size={20} />}</div>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        className={`social-toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
export function SettingsPage({ data, act, navigate, toast }) {
  const settings = data.user.settings || {};
  const update = (key, value) =>
    run(act, toast, "settings.update", { settings: { [key]: value } });
  return (
    <div className="social-page social-settings-page">
      <Heading
        eyebrow="YOUR WORLD, YOUR RULES"
        title="Make yourself comfortable."
        text="Choose how you connect, how you show up, and what feels right."
      />
      <div className="social-settings-grid">
        <section className="card social-settings-card">
          <div className="social-card-heading">
            <DoorOpen size={23} />
            <div>
              <h2>Connection & privacy</h2>
              <p>Every open door is your choice.</p>
            </div>
          </div>
          <label className="field social-knock-setting">
            Who can knock on your door?
            <select
              value={settings.knocks || "everyone"}
              onChange={(e) => update("knocks", e.target.value)}
            >
              <option value="everyone">Everyone</option>
              <option value="followers">People who follow me</option>
              <option value="nobody">Nobody — quiet time</option>
            </select>
          </label>
          <Toggle
            icon={Search}
            label="Appear in discovery"
            description="Let new people find your profile in the neighborhood."
            value={settings.discoverable !== false}
            onChange={(v) => update("discoverable", v)}
          />
          <Toggle
            icon={Eye}
            label="Show my online presence"
            description="Let people see when you’re around. This is independent of discovery."
            value={settings.onlineVisible !== false}
            onChange={(v) => update("onlineVisible", v)}
          />
          <Toggle
            icon={Users}
            label="Contact discovery consent"
            description="Let opted-in people find you by email. Check a list privately from Find your people; no address book is stored."
            value={!!settings.contactSync}
            onChange={(v) => update("contactSync", v)}
          />
          <p className="social-small-note">
            <Lock size={15} />
            Your room’s journal, tasks, memories, and planner require separate
            access permission.
          </p>
        </section>
        <section className="card social-settings-card">
          <div className="social-card-heading">
            <SlidersHorizontal size={23} />
            <div>
              <h2>Feel & focus</h2>
              <p>A quieter, clearer place for you.</p>
            </div>
          </div>
          <Toggle
            icon={Bell}
            label="In-app notifications"
            description="Get updates for knocks, invitations, and activity."
            value={settings.notifications !== false}
            onChange={(v) => update("notifications", v)}
          />
          <Toggle
            icon={Sparkles}
            label="Reduce motion"
            description="Keep transitions and animations still."
            value={!!settings.reducedMotion}
            onChange={(v) => update("reducedMotion", v)}
          />
          <Toggle
            icon={Eye}
            label="High contrast"
            description="Increase contrast across the interface for easier reading."
            value={!!settings.highContrast}
            onChange={(v) => update("highContrast", v)}
          />
          <div className="social-setting-footnote">
            <h3>You’re always in control.</h3>
            <p>
              Room visits never reveal private object contents automatically.
              Grant access one object at a time, and revoke it whenever you
              need.
            </p>
            <Button variant="secondary" onClick={() => navigate("safety")}>
              <Shield size={16} />
              Safety & account controls
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function NotificationsPage({ data, act, navigate, toast }) {
  const [tab, setTab] = useState("all");
  const notifications = (data.notifications || []).filter(
    (n) => tab !== "unread" || !n.read,
  );
  return (
    <div className="social-page">
      <Heading
        eyebrow="A LITTLE HELLO"
        title="Your neighborhood updates."
        text="Knocks, invitations, and little things worth knowing."
      >
        <Button
          variant="secondary"
          disabled={!(data.notifications || []).some((n) => !n.read)}
          onClick={() =>
            run(act, toast, "notifications.read", {}, "You’re all caught up")
          }
        >
          <Check size={17} />
          Mark all as read
        </Button>
      </Heading>
      <div className="tabs">
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          All updates
        </button>
        <button
          className={tab === "unread" ? "active" : ""}
          onClick={() => setTab("unread")}
        >
          Unread{" "}
          <span>
            {(data.notifications || []).filter((n) => !n.read).length}
          </span>
        </button>
      </div>
      <div className="social-notifications">
        {notifications.map((n) => (
          <article
            key={n.id}
            className={`card social-notification ${n.read ? "" : "unread"}`}
          >
            <div className="social-notification-icon">
              <Bell size={21} />
            </div>
            <div>
              <h3>{n.title}</h3>
              <p>{n.text}</p>
              <small>{timeAgo(n.createdAt)}</small>
            </div>
            {!n.read && (
              <span className="social-unread-dot" aria-label="Unread" />
            )}
          </article>
        ))}
      </div>
      {!notifications.length && (
        <Empty icon={Bell} title="A lovely little quiet moment">
          You’re all caught up. New updates will appear here.
        </Empty>
      )}
      <div className="social-notification-footer">
        <Button variant="secondary" onClick={() => navigate("visits")}>
          Open visits <DoorOpen size={16} />
        </Button>
        <Button variant="ghost" onClick={() => navigate("settings")}>
          Notification preferences <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}

export function SafetyPage({ data, act, navigate, toast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState("");
  const [report, setReport] = useState(null);
  const blocked = (data.users || []).filter(
    (u) => (data.blocks || []).includes(u.id) || u.blocked,
  );
  const exportData = async () => {
    setBusy(true);
    const result = await run(act, toast, "account.export");
    setBusy(false);
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify(result.data || result.export || result, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomverse-${data.user.handle}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Your data export has downloaded.");
  };
  return (
    <div className="social-page social-settings-page">
      <Heading
        eyebrow="FEEL AT HOME"
        title="Safety starts with choice."
        text="Your boundaries, your information, and a place to ask for help."
      />
      <div className="social-settings-grid">
        <div className="stack">
          <section className="card social-settings-card">
            <div className="social-card-heading">
              <Shield size={23} />
              <div>
                <h2>Your boundaries</h2>
                <p>Blocking prevents follows, knocks, and visits.</p>
              </div>
            </div>
            <h3 className="social-list-title">
              Blocked members <span>{blocked.length}</span>
            </h3>
            {blocked.length ? (
              blocked.map((u) => (
                <div className="social-blocked-member" key={u.id}>
                  <Avatar user={u} size={43} />
                  <div>
                    <PersonName user={u} />
                    <small>@{u.handle}</small>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      run(
                        act,
                        toast,
                        "block.toggle",
                        { userId: u.id },
                        "Member unblocked",
                      )
                    }
                  >
                    Unblock
                  </Button>
                </div>
              ))
            ) : (
              <p className="muted">
                You haven’t blocked anyone. A block control is available on
                every member’s profile.
              </p>
            )}
            <Button variant="ghost" onClick={() => navigate("settings")}>
              Privacy & connection settings <ChevronRight size={16} />
            </Button>
          </section>
          <section className="card social-settings-card">
            <div className="social-card-heading">
              <Flag size={23} />
              <div>
                <h2>Report a concern</h2>
                <p>Reports are reviewed privately by moderators.</p>
              </div>
            </div>
            <label className="field">
              Select a member
              <select
                value={reportTarget}
                onChange={(e) => setReportTarget(e.target.value)}
              >
                <option value="">Choose a member</option>
                {(data.users || [])
                  .filter((u) => u.id !== data.user.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.handle})
                    </option>
                  ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={!reportTarget}
              onClick={() => setReport(reportTarget)}
            >
              Report member <Flag size={15} />
            </Button>
            {(data.reports || []).length > 0 && (
              <div className="social-report-history">
                <h3>Your reports</h3>
                {data.reports
                  .filter((r) => !r.reporterId || r.reporterId === data.user.id)
                  .map((r) => (
                    <div key={r.id}>
                      <span>{r.reason}</span>
                      <Badge>{r.status || "In review"}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
        <section className="card social-settings-card">
          <div className="social-card-heading">
            <Lock size={23} />
            <div>
              <h2>Your account & data</h2>
              <p>You decide what stays here.</p>
            </div>
          </div>
          <div className="social-data-control">
            <Download size={21} />
            <div>
              <h3>Take your world with you</h3>
              <p>
                Download a JSON copy of your profile, room, private resources,
                and account activity.
              </p>
              <Button variant="secondary" disabled={busy} onClick={exportData}>
                <Download size={16} />
                {busy ? "Preparing…" : "Download my data"}
              </Button>
            </div>
          </div>
          <div className="social-data-control social-danger-control">
            <Trash2 size={21} />
            <div>
              <h3>Delete your account</h3>
              <p>
                Permanently remove your profile and private data. Your room and
                active visits will close.
              </p>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(true)}
              >
                Delete account
              </Button>
            </div>
          </div>
          <div className="social-safety-promise">
            <ShieldCheck size={28} />
            <h3>Private means private.</h3>
            <p>
              Private resources are checked on the server before they’re shared.
              Visit chat disappears when the visit ends. No chat transcript is
              saved.
            </p>
          </div>
        </section>
      </div>
      {report && (
        <ReportModal
          targetType="user"
          targetId={report}
          act={act}
          toast={toast}
          onClose={() => setReport(null)}
        />
      )}
      {confirmDelete && (
        <Modal
          title="Permanently delete your account?"
          onClose={() => setConfirmDelete(false)}
        >
          <p>
            Your profile, room, and personal content will be deleted. This
            cannot be undone.
          </p>
          {data.user.hasPassword !== false && (
            <label className="field">
              Account password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </label>
          )}
          <label className="field">
            Type DELETE to confirm
            <input
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
            />
          </label>
          <div className="social-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </Button>
            <Button
              disabled={
                busy ||
                deletePhrase !== "DELETE" ||
                (data.user.hasPassword !== false && !password)
              }
              onClick={async () => {
                setBusy(true);
                const result = await run(
                  act,
                  toast,
                  "account.delete",
                  { password, confirmation: deletePhrase },
                  "Your account was deleted.",
                );
                setBusy(false);
                if (result) {
                  setConfirmDelete(false);
                  navigate("feed");
                }
              }}
            >
              <Trash2 size={16} />
              Delete permanently
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Permissions({ value, onChange, compact = false, disabled = false }) {
  return (
    <div className={`social-permissions ${compact ? "compact" : ""}`}>
      {rights.map((right) => (
        <label key={right}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={!!value?.[right]}
            onChange={(e) => onChange({ ...value, [right]: e.target.checked })}
          />
          <span>{rightLabels[right]}</span>
        </label>
      ))}
    </div>
  );
}
function RequestAcceptModal({ request, data, act, toast, onClose }) {
  const [permissions, setPermissions] = useState(defaultRights);
  const [busy, setBusy] = useState(false);
  const person = userById(data, request.fromId);
  return (
    <Modal title="Welcome them on your terms" onClose={onClose}>
      <div className="social-knock-person">
        <Avatar user={person} size={62} />
        <div>
          <PersonName user={person} />
          <p className="muted">{request.reason || "Would love to visit"}</p>
        </div>
      </div>
      <p className="muted">
        Choose what {person?.name?.split(" ")[0] || "your guest"} can do.
        Private room objects still need separate permission.
      </p>
      <Permissions value={permissions} onChange={setPermissions} />
      <div className="social-modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Keep waiting
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await run(
              act,
              toast,
              "request.respond",
              { requestId: request.id, accept: true, permissions },
              "Door opened. They can choose to join now.",
            );
            setBusy(false);
            if (r) onClose();
          }}
        >
          Accept visit <DoorOpen size={16} />
        </Button>
      </div>
    </Modal>
  );
}
function SharedResourceEditor({ type, value, onChange }) {
  if (type === "whiteboard")
    return (
      <label className="field">
        Shared whiteboard
        <textarea
          rows={12}
          value={value?.text || ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Make a little space for your ideas…"
          maxLength={20000}
        />
      </label>
    );
  const entries = Array.isArray(value) ? value : [];
  const change = (index, key, next) =>
    onChange(
      entries.map((entry, i) =>
        i === index ? { ...entry, [key]: next } : entry,
      ),
    );
  const add = () => {
    const id = `shared_${crypto.randomUUID()}`;
    const date = new Date().toISOString().slice(0, 10);
    onChange([
      ...entries,
      type === "tasks"
        ? { id, text: "", done: false }
        : type === "journal"
          ? { id, title: "", text: "", date }
          : type === "planner"
            ? { id, title: "", date }
            : { id, title: "", url: "" },
    ]);
  };
  return (
    <div className="social-shared-editor">
      {entries.map((entry, i) => (
        <div className="social-shared-edit-entry" key={entry.id || i}>
          <div className="social-shared-edit-title">
            <strong>
              {type === "tasks"
                ? "Task"
                : type === "planner"
                  ? "Plan"
                  : type === "journal"
                    ? "Journal entry"
                    : "Memory"}{" "}
              {i + 1}
            </strong>
            <button
              className="icon-button"
              aria-label={`Remove entry ${i + 1}`}
              onClick={() => onChange(entries.filter((_, n) => n !== i))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          {type === "tasks" ? (
            <>
              <label className="field">
                Task
                <input
                  value={entry.text || ""}
                  maxLength={500}
                  onChange={(e) => change(i, "text", e.target.value)}
                />
              </label>
              <label className="social-shared-task-check">
                <input
                  type="checkbox"
                  checked={!!entry.done}
                  onChange={(e) => change(i, "done", e.target.checked)}
                />
                Completed
              </label>
            </>
          ) : (
            <>
              <label className="field">
                Title
                <input
                  value={entry.title || ""}
                  maxLength={150}
                  onChange={(e) => change(i, "title", e.target.value)}
                />
              </label>
              {["planner", "journal"].includes(type) && (
                <label className="field">
                  Date
                  <input
                    type="date"
                    value={(entry.date || "").slice(0, 10)}
                    onChange={(e) => change(i, "date", e.target.value)}
                  />
                </label>
              )}
              {type === "journal" && (
                <label className="field">
                  Entry
                  <textarea
                    rows={5}
                    value={entry.text || ""}
                    maxLength={20000}
                    onChange={(e) => change(i, "text", e.target.value)}
                  />
                </label>
              )}
              {type === "memories" && (
                <label className="field">
                  Memory link
                  <input
                    type="url"
                    value={entry.url || ""}
                    onChange={(e) => change(i, "url", e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              )}
            </>
          )}
        </div>
      ))}
      <Button variant="secondary" onClick={add}>
        <Plus size={15} />
        Add{" "}
        {type === "tasks"
          ? "task"
          : type === "planner"
            ? "plan"
            : type === "journal"
              ? "entry"
              : "memory"}
      </Button>
    </div>
  );
}
function GuestResource({ resource, session, data, act, toast, socket }) {
  const [content, setContent] = useState(null),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [scope, setScope] = useState("read"),
    [draft, setDraft] = useState(null);
  const grant = session.grants?.find(
    (g) => g.resourceId === resource.id && g.userId === data.user.id,
  );
  const accessEpoch = useRef(0);
  const requested = data.requests?.some(
    (r) =>
      r.type === "access" &&
      r.resourceId === resource.id &&
      r.fromId === data.user.id &&
      r.status === "pending",
  );
  useEffect(() => {
    const clear = (payload) => {
      if (!payload?.resourceIds || payload.resourceIds.includes(resource.id)) {
        accessEpoch.current++;
        setContent(null);
        setDraft(null);
        setOpen(false);
      }
    };
    socket?.on("resources:revoked", clear);
    socket?.on("session:ended", clear);
    socket?.on("session:revoked", clear);
    return () => {
      accessEpoch.current++;
      socket?.off("resources:revoked", clear);
      socket?.off("session:ended", clear);
      socket?.off("session:revoked", clear);
    };
  }, [socket, resource.id]);
  useEffect(() => {
    if (!grant) {
      accessEpoch.current++;
      setContent(null);
      setDraft(null);
    }
  }, [grant]);
  const view = async () => {
    const epoch = ++accessEpoch.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/resources/${encodeURIComponent(resource.id)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "This object is private.");
      if (epoch !== accessEpoch.current) return;
      const value = json.resource || json;
      setContent(value.content);
      setDraft(structuredClone(value.content));
      setOpen(true);
    } catch (err) {
      toast(err.message);
      setContent(null);
    } finally {
      setLoading(false);
    }
  };
  const close = () => {
    accessEpoch.current++;
    setOpen(false);
    setContent(null);
    setDraft(null);
    run(act, toast, "resource.close", { resourceId: resource.id });
  };
  return (
    <div className="social-private-object">
      <div className="social-private-object-icon">
        <FileText size={20} />
      </div>
      <div>
        <strong>{resource.title}</strong>
        <span>
          {grant
            ? `${grant.scope === "write" ? "Edit" : grant.scope === "once" ? "One-time" : "Read"} access shared`
            : "Private · contents hidden"}
        </span>
      </div>
      {grant ? (
        <Button variant="secondary" disabled={loading} onClick={view}>
          {loading ? "Opening…" : "Open"}
        </Button>
      ) : (
        <Button
          variant="secondary"
          disabled={requested}
          onClick={() => setOpen(true)}
        >
          <Lock size={14} />
          {requested ? "Requested" : "Ask to open"}
        </Button>
      )}
      {open && (
        <Modal title={resource.title} onClose={close}>
          {content === null ? (
            <>
              <p>
                This object belongs to the host. Choose the access you need;
                they decide whether to share.
              </p>
              <label className="field">
                Access level
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="once">View once</option>
                  <option value="read">Read during this visit</option>
                  <option value="write">Read and edit during this visit</option>
                </select>
              </label>
              <Button
                onClick={async () => {
                  const r = await run(
                    act,
                    toast,
                    "resource.request",
                    { resourceId: resource.id, scope },
                    "Permission request sent to the host",
                  );
                  if (r) setOpen(false);
                }}
              >
                Request permission <Lock size={15} />
              </Button>
            </>
          ) : grant?.scope === "write" ? (
            <>
              <p className="muted">
                The host shared editing permission for this visit.
              </p>
              <SharedResourceEditor
                type={resource.type}
                value={draft}
                onChange={setDraft}
              />
              <div className="social-modal-actions">
                <Button
                  onClick={async () => {
                    const r = await run(
                      act,
                      toast,
                      "resource.save",
                      { resourceId: resource.id, content: draft },
                      "Shared object updated",
                    );
                    if (r) setContent(structuredClone(draft));
                  }}
                >
                  Save changes
                </Button>
              </div>
            </>
          ) : (
            <div className="social-shared-content">
              {Array.isArray(content) ? (
                content.length ? (
                  content.map((entry, i) => (
                    <div key={entry.id || i}>
                      <strong>
                        {entry.title || entry.text || `Item ${i + 1}`}
                      </strong>
                      {entry.title && entry.text && <p>{entry.text}</p>}
                      {entry.date && <small>{entry.date}</small>}
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noreferrer">
                          Open shared memory <ArrowUpRight size={14} />
                        </a>
                      )}
                      {"done" in entry && (
                        <span>{entry.done ? "Completed" : "To do"}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p>This object is empty.</p>
                )
              ) : (
                <p>{content?.text || "An empty page, ready for ideas."}</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function VisitRoom({ data, act, toast, navigate }) {
  const room = data.session.room;
  const host = data.session.hostId === data.user.id;
  const canInteract =
    host ||
    data.session.participants?.find((p) => p.userId === data.user.id)
      ?.permissions?.interact;
  const [editing, setEditing] = useState(false),
    [layout, setLayout] = useState(room.objects || []),
    [selected, setSelected] = useState(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setLayout(room.objects || []);
    setSelected(null);
  }, [room.version, room.id]);
  useEffect(() => {
    if (!canInteract) {
      setEditing(false);
      setLayout(room.objects || []);
    }
  }, [canInteract]);
  const changed = JSON.stringify(layout) !== JSON.stringify(room.objects || []);
  return (
    <section className="card social-visit-room">
      <div className="social-visit-room-heading">
        <div>
          <h3>
            {host
              ? "Your little world"
              : `${userById(data, data.session.hostId)?.name?.split(" ")[0] || "Your host"}’s little world`}
          </h3>
          <p>
            {editing
              ? "Move furniture with a drag, or arrow keys. Save when it feels right."
              : "A shared room, with boundaries that stay yours."}
          </p>
        </div>
        {canInteract && (
          <Button
            variant="secondary"
            onClick={() => {
              if (editing) setLayout(room.objects || []);
              setEditing(!editing);
            }}
          >
            <Hand size={15} />
            {editing ? "Finish arranging" : "Arrange together"}
          </Button>
        )}
      </div>
      <div className="social-real-room-scene">
        <RoomScene
          room={{ ...room, objects: layout }}
          user={userById(data, data.session.hostId)}
          editing={editing && canInteract}
          selected={selected}
          onSelect={setSelected}
          onMove={(id, x, y) =>
            setLayout((current) =>
              current.map((o) => (o.id === id ? { ...o, x, y } : o)),
            )
          }
          onObjectClick={(o) => {
            if (o.type === "desk")
              document.getElementById("visit-private-objects")?.scrollIntoView({
                behavior: data.user.settings?.reducedMotion ? "auto" : "smooth",
                block: "center",
              });
            else
              toast(
                `${o.type.charAt(0).toUpperCase() + o.type.slice(1)} — a little part of ${host ? "your" : "your host’s"} world.`,
              );
          }}
        />
      </div>
      <div className="social-visit-room-footer">
        <span>
          <Lock size={13} />
          Private object contents aren’t shared with the room.
        </span>
        {editing && changed && (
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const r = await run(
                act,
                toast,
                "room.update",
                { roomId: room.id, version: room.version, objects: layout },
                "Shared room layout updated",
              );
              setSaving(false);
              if (r) setEditing(false);
            }}
          >
            {saving ? "Saving…" : "Save layout"} <Check size={15} />
          </Button>
        )}
      </div>
    </section>
  );
}

function VisitChat({ data, socket, toast }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const tail = useRef(null);
  const session = data.session;
  const participant = session?.participants?.find(
    (p) => p.userId === data.user.id,
  );
  const canChat =
    session?.hostId === data.user.id || !!participant?.permissions?.chat;
  useEffect(() => {
    setMessages([]);
    setText("");
    if (!socket || !session) return;
    const onMessage = (m) => setMessages((prev) => [...prev.slice(-149), m]);
    const clear = () => {
      setMessages([]);
      setText("");
    };
    const permissionsChanged = (event) => {
      if (event?.permissions?.chat === false) clear();
    };
    socket.on("session:permissions", permissionsChanged);
    socket.on("chat:message", onMessage);
    socket.on("session:ended", clear);
    socket.on("session:revoked", clear);
    return () => {
      socket.off("session:permissions", permissionsChanged);
      socket.off("chat:message", onMessage);
      socket.off("session:ended", clear);
      socket.off("session:revoked", clear);
    };
  }, [socket, session?.id]);
  useEffect(() => {
    if (!canChat) {
      setMessages([]);
      setText("");
    }
  }, [canChat]);
  useEffect(() => {
    tail.current?.scrollIntoView({
      behavior: data.user.settings?.reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [messages.length]);
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!socket?.connected) return toast("You’re offline. Reconnect to chat.");
    socket.emit("chat:send", { text: text.trim() }, (response) => {
      if (!response?.ok) toast(response?.error || "Chat couldn’t be sent");
      else setText("");
    });
  };
  return (
    <section className="card social-chat">
      <div className="social-chat-heading">
        <h3>
          <MessageCircle size={18} />
          Visit chat
        </h3>
        <Badge>Disappears after visit</Badge>
      </div>
      {!canChat ? (
        <div className="social-chat-disabled">
          <Lock size={23} />
          <p>The host hasn’t shared chat permission.</p>
        </div>
      ) : (
        <>
          <div className="social-chat-messages">
            {!messages.length && (
              <div className="social-chat-empty">
                <MessageCircle size={23} />
                <p>Say a little hello.</p>
                <span>
                  Only people with chat permission can see messages. Nothing is
                  saved.
                </span>
              </div>
            )}
            {messages.map((m) => (
              <div
                className={`social-chat-message ${m.userId === data.user.id ? "mine" : ""}`}
                key={m.id}
              >
                <Avatar user={userById(data, m.userId)} size={29} />
                <div>
                  <span>{userById(data, m.userId)?.name || "Guest"}</span>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={tail} />
          </div>
          <form className="social-chat-compose" onSubmit={send}>
            <input
              aria-label="Chat message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Say something kind…"
            />
            <button
              className="icon-button"
              type="submit"
              disabled={!text.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

export function VisitsPage({ data, act, navigate, toast, socket }) {
  const [tab, setTab] = useState("incoming");
  const [accept, setAccept] = useState(null);
  const [invite, setInvite] = useState(false);
  const [inviteUser, setInviteUser] = useState("");
  const [editPermission, setEditPermission] = useState(null);
  const [permissions, setPermissions] = useState(defaultRights);
  const session = data.session;
  const host = session?.hostId === data.user.id;
  const canInvite =
    host ||
    session?.participants?.find((p) => p.userId === data.user.id)?.permissions
      ?.invite;
  const pending = (data.requests || []).filter(
    (r) => r.status === "pending" && r.type !== "access",
  );
  const incoming = pending.filter((r) => r.toId === data.user.id);
  const outgoing = pending.filter((r) => r.fromId === data.user.id);
  const accepted = (data.myVisits || []).filter(
    (r) =>
      r.status === "accepted" &&
      ((r.toId === data.user.id && r.type === "invite") ||
        (r.fromId === data.user.id && r.type === "knock")),
  );
  const access = (data.requests || []).filter(
    (r) =>
      r.type === "access" && r.status === "pending" && r.toId === data.user.id,
  );
  const list =
    tab === "incoming" ? incoming : tab === "outgoing" ? outgoing : accepted;
  const followers = (data.users || []).filter(
    (u) => u.id !== data.user.id && !u.blocked,
  );
  return (
    <div className="social-page">
      <Heading
        eyebrow="A DOOR THAT OPENS BY CHOICE"
        title={
          session
            ? host
              ? "Your room has company."
              : "Make yourself at home."
            : "Good company starts with a knock."
        }
        text={
          session
            ? "Be present, share a little, and leave whenever you need."
            : "Welcome a friend, or take a little visit into someone else’s world."
        }
      >
        <div className="row">
          {!session && (
            <Button
              variant="secondary"
              onClick={() =>
                run(
                  act,
                  toast,
                  "session.start",
                  {},
                  "Your room is open for an invited visit",
                )
              }
            >
              <DoorOpen size={17} />
              Open my room
            </Button>
          )}
          {(!session || canInvite) && (
            <Button onClick={() => setInvite(true)}>
              <UserPlus size={17} />
              Invite a friend
            </Button>
          )}
        </div>
      </Heading>
      {session && (
        <>
          <div className="social-visit-livebar">
            <span>
              <i />
              LIVE VISIT
            </span>
            <span>
              Hosted by {userById(data, session.hostId)?.name || "your host"} ·{" "}
              {session.participants?.length || 0} people
            </span>
            <Button
              variant="secondary"
              onClick={() =>
                run(
                  act,
                  toast,
                  host ? "session.end" : "session.leave",
                  {},
                  host
                    ? "Visit ended. Chat and guest permissions were cleared."
                    : "You left the visit. Chat and shared content were cleared.",
                )
              }
            >
              <LogOut size={15} />
              {host ? "End visit for everyone" : "Leave visit"}
            </Button>
          </div>
          <div className="social-visit-grid">
            <div className="stack">
              <VisitRoom
                data={data}
                act={act}
                toast={toast}
                navigate={navigate}
              />
              <MediaCall data={data} act={act} socket={socket} toast={toast} />
              <section className="card social-visit-participants">
                <div className="section-title">
                  <h3>People in this room</h3>
                  <Users size={18} />
                </div>
                {(session.participants || []).map((p) => {
                  const person = userById(data, p.userId);
                  return (
                    <div className="social-participant" key={p.userId}>
                      <Avatar user={person} size={44} />
                      <div>
                        <PersonName user={person} />
                        <small>
                          {p.userId === session.hostId
                            ? "Host · your room, your rules"
                            : rights
                                .filter((r) => p.permissions?.[r])
                                .map((r) => rightLabels[r])
                                .join(" · ") || "Looking around"}
                        </small>
                      </div>
                      {host && p.userId !== data.user.id && (
                        <div className="row">
                          <button
                            className="icon-button"
                            aria-label={`Permissions for ${person?.name}`}
                            onClick={() => {
                              setEditPermission(p);
                              setPermissions(p.permissions || defaultRights);
                            }}
                          >
                            <SlidersHorizontal size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Remove ${person?.name}`}
                            onClick={() =>
                              run(
                                act,
                                toast,
                                "session.remove",
                                { userId: p.userId },
                                "Guest removed and access cleared",
                              )
                            }
                          >
                            <UserMinus size={17} />
                          </button>
                        </div>
                      )}
                      {p.userId === session.hostId && (
                        <Badge tone="green">Host</Badge>
                      )}
                    </div>
                  );
                })}
              </section>
              {host ? (
                <section
                  className="card social-resource-host"
                  id="visit-private-objects"
                >
                  <div className="section-title">
                    <h3>Private object requests</h3>
                    <Lock size={18} />
                  </div>
                  {access.map((r) => {
                    const person = userById(data, r.fromId);
                    const resource = (data.resources || []).find(
                      (v) => v.id === r.resourceId,
                    );
                    return (
                      <div className="social-access-request" key={r.id}>
                        <Avatar user={person} size={37} />
                        <div>
                          <strong>
                            {person?.name} wants to open{" "}
                            {resource?.title || "a private object"}
                          </strong>
                          <p>
                            Requested{" "}
                            {r.scope === "write"
                              ? "editing"
                              : r.scope === "once"
                                ? "one-time view"
                                : "reading"}{" "}
                            permission
                          </p>
                          <div className="social-access-actions">
                            {[
                              ["once", "View once"],
                              ["read", "Read"],
                              ["write", "Read & edit"],
                              ["deny", "Deny"],
                            ].map(([scope, label]) => (
                              <button
                                key={scope}
                                onClick={() =>
                                  run(
                                    act,
                                    toast,
                                    "resource.grant",
                                    { requestId: r.id, scope },
                                    scope === "deny"
                                      ? "Request denied"
                                      : "Permission shared",
                                  )
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!access.length && (
                    <p className="muted">
                      Nobody has requested a private object. Contents stay
                      hidden until you approve.
                    </p>
                  )}
                  {(session.grants || [])
                    .filter((g) => g.userId !== data.user.id)
                    .map((g) => (
                      <div
                        className="social-active-grant"
                        key={`${g.resourceId}-${g.userId}`}
                      >
                        <span>
                          <strong>{userById(data, g.userId)?.name}</strong> ·{" "}
                          {(data.resources || []).find(
                            (r) => r.id === g.resourceId,
                          )?.title || "Shared object"}{" "}
                          · {g.scope}
                        </span>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            run(
                              act,
                              toast,
                              "resource.revoke",
                              { resourceId: g.resourceId, userId: g.userId },
                              "Access revoked. Shared content was cleared.",
                            )
                          }
                        >
                          <Lock size={14} />
                          Revoke
                        </Button>
                      </div>
                    ))}
                </section>
              ) : (
                <section
                  className="card social-resource-host"
                  id="visit-private-objects"
                >
                  <div className="section-title">
                    <h3>Your host’s private objects</h3>
                    <Lock size={18} />
                  </div>
                  <p className="muted">
                    You can see these objects exist. Ask their owner before
                    opening the contents.
                  </p>
                  {(session.room?.resources || []).map((resource) => (
                    <GuestResource
                      key={`${session.id}-${resource.id}`}
                      resource={resource}
                      session={session}
                      data={data}
                      act={act}
                      toast={toast}
                      socket={socket}
                    />
                  ))}
                  {!session.room?.resources?.length && (
                    <p className="muted">
                      No private objects are available to request.
                    </p>
                  )}
                </section>
              )}
            </div>
            <VisitChat data={data} socket={socket} toast={toast} />
          </div>
        </>
      )}
      <div className="social-requests-heading">
        <h2>{session ? "At your door" : "Visits & invitations"}</h2>
        <div className="tabs">
          {[
            [
              "incoming",
              `Incoming ${incoming.length ? `(${incoming.length})` : ""}`,
            ],
            ["outgoing", "Sent"],
            [
              "ready",
              `Ready to join ${accepted.length ? `(${accepted.length})` : ""}`,
            ],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="social-request-list">
        {list.map((r) => {
          const person = userById(
            data,
            r.fromId === data.user.id ? r.toId : r.fromId,
          );
          return (
            <div className="card social-request-card" key={r.id}>
              <Avatar user={person} size={55} />
              <div>
                <PersonName user={person} />
                <p>
                  {r.type === "invite"
                    ? tab === "outgoing"
                      ? "You invited them into your room."
                      : "Invited you into their room."
                    : r.reason || "A knock on your door"}
                </p>
                <small>
                  <Clock size={12} />
                  {timeAgo(r.createdAt)}
                  {r.expiresAt
                    ? ` · Expires ${new Date(r.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                    : ""}
                </small>
              </div>
              <div className="social-request-actions">
                {tab === "incoming" ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(
                          act,
                          toast,
                          "request.respond",
                          { requestId: r.id, accept: false },
                          "Request declined",
                        )
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() =>
                        r.type === "knock"
                          ? setAccept(r)
                          : run(
                              act,
                              toast,
                              "request.respond",
                              { requestId: r.id, accept: true },
                              "Invitation accepted. Open Ready to join when you’re ready.",
                            )
                      }
                    >
                      {r.type === "knock" ? "Welcome in" : "Accept invite"}{" "}
                      <DoorOpen size={15} />
                    </Button>
                  </>
                ) : tab === "outgoing" ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      run(
                        act,
                        toast,
                        "request.cancel",
                        { requestId: r.id },
                        "Request cancelled",
                      )
                    }
                  >
                    Cancel request
                  </Button>
                ) : (
                  <Button
                    disabled={!!session}
                    onClick={() =>
                      run(
                        act,
                        toast,
                        "session.join",
                        { requestId: r.id },
                        "Welcome in. Your host’s permissions apply.",
                      )
                    }
                  >
                    Join room <ArrowUpRight size={15} />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!list.length && (
        <Empty
          icon={tab === "outgoing" ? Send : DoorOpen}
          title={
            tab === "incoming"
              ? "Your door is quietly waiting."
              : tab === "outgoing"
                ? "No knocks out in the world."
                : "No visits ready just yet."
          }
        >
          {tab === "incoming" ? (
            "When someone knocks or invites you, you’ll find it here. Nobody enters without your choice."
          ) : tab === "outgoing" ? (
            <>
              <p>Find someone whose world you’d like to visit.</p>
              <Button variant="secondary" onClick={() => navigate("people")}>
                Explore people <Users size={15} />
              </Button>
            </>
          ) : (
            "Accepted knocks and invitations appear here. You choose when to join."
          )}
        </Empty>
      )}
      {accept && (
        <RequestAcceptModal
          request={accept}
          data={data}
          act={act}
          toast={toast}
          onClose={() => setAccept(null)}
        />
      )}
      {invite && (
        <Modal
          title="Good company, by invitation"
          onClose={() => setInvite(false)}
        >
          <p className="muted">
            {session && !host
              ? "Your host shared permission to invite a friend into this room. They accept before they enter."
              : "Invite a friend to visit your room. They accept first, then choose when to enter."}
          </p>
          <label className="field">
            Who would you like to invite?
            <select
              value={inviteUser}
              onChange={(e) => setInviteUser(e.target.value)}
            >
              <option value="">Choose a person</option>
              {followers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.handle})
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!inviteUser}
            onClick={async () => {
              const r = await run(
                act,
                toast,
                "invite.create",
                { userId: inviteUser },
                "Invitation sent",
              );
              if (r) {
                setInvite(false);
                setInviteUser("");
              }
            }}
          >
            Send invitation <Send size={16} />
          </Button>
        </Modal>
      )}
      {editPermission && (
        <Modal
          title={`Permissions for ${userById(data, editPermission.userId)?.name || "guest"}`}
          onClose={() => setEditPermission(null)}
        >
          <p className="muted">
            Changes apply immediately. Private resource access is separate.
          </p>
          <Permissions value={permissions} onChange={setPermissions} />
          <Button
            onClick={async () => {
              const r = await run(
                act,
                toast,
                "session.permissions",
                { userId: editPermission.userId, permissions },
                "Guest permissions updated",
              );
              if (r) setEditPermission(null);
            }}
          >
            Save permissions
          </Button>
        </Modal>
      )}
    </div>
  );
}
