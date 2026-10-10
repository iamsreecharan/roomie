import React, { useEffect, useState } from "react";
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
import "./social.css";

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
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={`Knock on ${person.name.split(" ")[0]}’s room`}
      onClose={onClose}
    >
      <div className="friends-modal-person">
        <Avatar user={person} size={64} />
        <div>
          <PersonName user={person} />
          <p className="muted">@{person.handle}</p>
        </div>
      </div>
      <p className="muted">
        Your friend chooses whether to accept this visit. Room content stays
        private until they share it.
      </p>
      <label className="field">
        Short message <span className="friends-optional">Optional</span>
        <textarea
          rows={3}
          maxLength={160}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Want to catch up?"
        />
      </label>
      <span className="friends-count">{message.length}/160</span>
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
              "knock.create",
              { hostId: person.id, message: message.trim() },
              "Knock sent",
            );
            setBusy(false);
            if (result) onClose();
          }}
        >
          <DoorOpen size={16} />
          {busy ? "Sending…" : "Send knock"}
        </Button>
      </div>
    </Modal>
  );
}
function FriendRequestModal({ person, onClose, act, toast }) {
  const [requestKnockAccess, setRequest] = useState(false),
    [grantKnockAccess, setGrant] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Send a friend request" onClose={onClose}>
      <div className="friends-modal-person">
        <Avatar user={person} size={64} />
        <div>
          <PersonName user={person} />
          <p className="muted">@{person.handle}</p>
        </div>
      </div>
      <p className="muted">
        Becoming friends does not automatically share room access. Choose each
        permission separately.
      </p>
      <div className="friends-request-choices">
        <label>
          <input
            type="checkbox"
            checked={requestKnockAccess}
            onChange={(e) => setRequest(e.target.checked)}
          />
          <span>
            <strong>Ask to knock on their room</strong>
            <small>
              {person.name.split(" ")[0]} can approve or decline this permission
              when accepting.
            </small>
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={grantKnockAccess}
            onChange={(e) => setGrant(e.target.checked)}
          />
          <span>
            <strong>Let them knock on my room</strong>
            <small>
              This takes effect if they accept your friendship. You can revoke
              it later.
            </small>
          </span>
        </label>
      </div>
      <div className="friends-private-note">
        <Lock size={15} />
        <span>
          A knock asks for a visit. It never opens a room or reveals private
          content.
        </span>
      </div>
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
              "friend.request",
              { userId: person.id, requestKnockAccess, grantKnockAccess },
              "Friend request sent",
            );
            setBusy(false);
            if (result) onClose();
          }}
        >
          <UserPlus size={16} />
          {busy ? "Sending…" : "Send request"}
        </Button>
      </div>
    </Modal>
  );
}
function FriendResponse({ request, person, act, toast, onDone }) {
  const [allow, setAllow] = useState(false),
    [busy, setBusy] = useState(false);
  const respond = async (accept) => {
    setBusy(true);
    const result = await run(
      act,
      toast,
      "friend.respond",
      {
        requestId: request.id,
        accept,
        grantKnockAccess: accept && request.requestKnockAccess && allow,
      },
      accept ? "Friend request accepted" : "Friend request declined",
    );
    setBusy(false);
    if (result) onDone?.();
  };
  return (
    <div className="friends-response">
      <p>
        {request.requestKnockAccess
          ? `${person?.name || "This person"} asked for permission to knock on your room.`
          : "This request does not ask for permission to knock on your room."}
      </p>
      {request.grantKnockAccess && (
        <div className="friends-offered-access">
          <DoorOpen size={15} />
          They offered you permission to knock on their room.
        </div>
      )}
      {request.requestKnockAccess && (
        <label className="friends-allow-request">
          <input
            type="checkbox"
            checked={allow}
            onChange={(e) => setAllow(e.target.checked)}
          />
          <span>
            Allow {person?.name?.split(" ")[0] || "them"} to knock on my room
          </span>
        </label>
      )}
      <div className="friends-response-actions">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => respond(false)}
        >
          Reject
        </Button>
        <Button disabled={busy} onClick={() => respond(true)}>
          <Check size={16} />
          {busy ? "Updating…" : "Accept friendship"}
        </Button>
      </div>
    </div>
  );
}
function RespondFriendModal({ request, person, act, toast, onClose }) {
  return (
    <Modal title="Friend request" onClose={onClose}>
      <div className="friends-modal-person">
        <Avatar user={person} size={64} />
        <div>
          <PersonName user={person} />
          <p className="muted">@{person?.handle}</p>
        </div>
      </div>
      <FriendResponse
        request={request}
        person={person}
        act={act}
        toast={toast}
        onDone={onClose}
      />
    </Modal>
  );
}
function MutualFriends({ person, navigate, compact = false }) {
  const mutuals = person.mutuals || [];
  return (
    <div className={`friends-mutuals ${compact ? "compact" : ""}`}>
      <div className="friends-mutual-avatars">
        {mutuals.slice(0, 3).map((u) => (
          <button
            key={u.id}
            aria-label={`View ${u.name}`}
            onClick={() => navigate("profile", u.id)}
          >
            <Avatar user={u} size={compact ? 23 : 29} />
          </button>
        ))}
      </div>
      <span>
        {person.mutualCount || 0} mutual{" "}
        {person.mutualCount === 1 ? "friend" : "friends"}
      </span>
    </div>
  );
}
function KnockAccessToggle({ person, act, toast }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="friends-knock-control">
      <div>
        <DoorOpen size={17} />
        <span>Can knock on my room</span>
      </div>
      <button
        className={`social-toggle ${person.canKnockAtMine ? "on" : ""}`}
        role="switch"
        aria-checked={!!person.canKnockAtMine}
        aria-label={`Allow ${person.name} to knock on my room`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await run(
            act,
            toast,
            "friend.knock",
            { userId: person.id, allow: !person.canKnockAtMine },
            person.canKnockAtMine
              ? "Knock permission removed"
              : "Knock permission shared",
          );
          setBusy(false);
        }}
      >
        <span />
      </button>
    </div>
  );
}
function FriendCard({
  person,
  data,
  act,
  toast,
  navigate,
  onRequest,
  onKnock,
  onRespond,
}) {
  const request = (data.requests || []).find(
    (r) =>
      r.type === "friend" &&
      r.status === "pending" &&
      (r.id === person.incomingRequestId ||
        (r.fromId === person.id && r.toId === data.user.id)),
  );
  return (
    <article className="card friends-person-card">
      <div className="friends-person-header">
        <button
          className="friends-avatar-link"
          aria-label={`View ${person.name}'s profile`}
          onClick={() => navigate("profile", person.id)}
        >
          <Avatar user={person} size={78} />
        </button>
        <div className="friends-person-copy">
          <button
            className="friends-name-link"
            onClick={() => navigate("profile", person.id)}
          >
            <PersonName user={person} />
          </button>
          <span>@{person.handle}</span>
          {person.isFriend ? (
            <Badge tone="sage">
              <Check size={11} />
              Friends
            </Badge>
          ) : person.friendshipStatus === "outgoing" ? (
            <Badge>Request sent</Badge>
          ) : person.friendshipStatus === "incoming" ? (
            <Badge tone="coral">Wants to be friends</Badge>
          ) : null}
        </div>
      </div>
      <p className="friends-bio">{person.bio || "No bio yet."}</p>
      <MutualFriends person={person} navigate={navigate} compact />
      {person.isFriend && (
        <KnockAccessToggle person={person} act={act} toast={toast} />
      )}
      <div className="friends-card-actions">
        <Button
          variant="secondary"
          onClick={() => navigate("profile", person.id)}
        >
          View profile
        </Button>
        {person.isFriend ? (
          person.canKnock ? (
            <Button onClick={() => onKnock(person)}>
              <DoorOpen size={15} />
              Knock
            </Button>
          ) : (
            <span className="friends-no-knock">
              <Lock size={12} />
              Knock access not shared
            </span>
          )
        ) : person.friendshipStatus === "incoming" && request ? (
          <Button onClick={() => onRespond({ request, person })}>
            Review request
          </Button>
        ) : person.friendshipStatus === "outgoing" ? (
          <Button
            variant="ghost"
            onClick={() =>
              run(
                act,
                toast,
                "friend.cancel",
                {
                  requestId: person.outgoingRequestId || person.friendRequestId,
                },
                "Friend request cancelled",
              )
            }
          >
            Cancel request
          </Button>
        ) : (
          <Button onClick={() => onRequest(person)}>
            <UserPlus size={15} />
            Add friend
          </Button>
        )}
      </div>
    </article>
  );
}

export function PeoplePage({ data, act, navigate, toast, selectedId }) {
  const [query, setQuery] = useState(selectedId || ""),
    [tab, setTab] = useState("friends"),
    [suggestionsOpen, setSuggestionsOpen] = useState(false),
    [activeSuggestion, setActiveSuggestion] = useState(-1),
    [requestPerson, setRequestPerson] = useState(null),
    [knockPerson, setKnockPerson] = useState(null),
    [respond, setRespond] = useState(null);
  useEffect(() => {
    setQuery(selectedId || "");
    if (selectedId) setTab("discover");
  }, [selectedId]);
  const all = (data.users || []).filter(
      (u) => u.id !== data.user.id && !u.blocked,
    ),
    friends = all.filter((u) => u.isFriend),
    requests = (data.requests || []).filter(
      (r) => r.type === "friend" && r.status === "pending",
    ),
    incoming = requests.filter((r) => r.toId === data.user.id),
    outgoing = requests.filter((r) => r.fromId === data.user.id);
  const matches = all.filter((u) =>
      `${u.name} ${u.handle}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ),
    suggestions = query.trim() ? matches.slice(0, 6) : [],
    visible = (
      query.trim() ? matches : tab === "friends" ? friends : all
    ).filter((u) => tab === "discover" || query.trim() || u.isFriend);
  const selectSuggestion = (person) => {
    setSuggestionsOpen(false);
    navigate("profile", person.id);
  };
  return (
    <div className="social-page friends-page">
      <Heading
        eyebrow="CONNECTIONS"
        title="Friends"
        text="Find people and choose who can knock on your room."
      />
      <div className="friends-search-area">
        <div className="friends-search-box">
          <Search size={19} />
          <input
            role="combobox"
            aria-label="Search people"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="friends-suggestions"
            aria-activedescendant={
              activeSuggestion >= 0
                ? `friend-suggestion-${activeSuggestion}`
                : undefined
            }
            placeholder="Search by name or handle"
            value={query}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 130)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestionsOpen(true);
              setActiveSuggestion(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestion((i) =>
                  Math.min(suggestions.length - 1, i + 1),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion((i) => Math.max(0, i - 1));
              } else if (e.key === "Escape") {
                setSuggestionsOpen(false);
              } else if (
                e.key === "Enter" &&
                activeSuggestion >= 0 &&
                suggestions[activeSuggestion]
              ) {
                e.preventDefault();
                selectSuggestion(suggestions[activeSuggestion]);
              }
            }}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setActiveSuggestion(-1);
              }}
            >
              <X size={17} />
            </button>
          )}
        </div>
        {suggestionsOpen && suggestions.length > 0 && (
          <div
            id="friends-suggestions"
            role="listbox"
            className="friends-suggestions"
          >
            {suggestions.map((u, i) => (
              <button
                id={`friend-suggestion-${i}`}
                key={u.id}
                role="option"
                aria-selected={i === activeSuggestion}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(u)}
              >
                <Avatar user={u} size={38} />
                <span>
                  <PersonName user={u} />
                  <small>@{u.handle}</small>
                </span>
                <span className="friends-suggestion-status">
                  {u.isFriend
                    ? "Friend"
                    : u.mutualCount
                      ? `${u.mutualCount} mutual`
                      : "View profile"}
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="friends-nav">
        <div className="tabs">
          {[
            [
              "friends",
              `My friends${friends.length ? ` (${friends.length})` : ""}`,
            ],
            [
              "requests",
              `Requests${incoming.length ? ` (${incoming.length})` : ""}`,
            ],
            ["discover", "Find people"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setSuggestionsOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="friends-permission-reminder">
          <Lock size={13} />
          Friendship and room permissions are separate.
        </span>
      </div>
      {tab === "requests" && !query.trim() ? (
        <div className="friends-requests">
          <section>
            <div className="section-title">
              <h2>Incoming requests</h2>
              <Badge>{incoming.length}</Badge>
            </div>
            {incoming.length ? (
              incoming.map((r) => {
                const person = userById(data, r.fromId);
                return (
                  <article className="card friends-request-card" key={r.id}>
                    <button
                      className="social-person-button"
                      onClick={() => navigate("profile", r.fromId)}
                    >
                      <Avatar user={person} size={52} />
                      <span>
                        <PersonName user={person} />
                        <small>
                          @{person?.handle} · {timeAgo(r.createdAt)}
                        </small>
                      </span>
                    </button>
                    <FriendResponse
                      request={r}
                      person={person}
                      act={act}
                      toast={toast}
                    />
                  </article>
                );
              })
            ) : (
              <Empty icon={UserPlus} title="No incoming requests">
                Friend requests you receive will appear here.
              </Empty>
            )}
          </section>
          <section>
            <div className="section-title">
              <h2>Sent requests</h2>
              <Badge>{outgoing.length}</Badge>
            </div>
            {outgoing.length ? (
              outgoing.map((r) => {
                const person = userById(data, r.toId);
                return (
                  <article
                    className="card friends-request-card sent"
                    key={r.id}
                  >
                    <button
                      className="social-person-button"
                      onClick={() => navigate("profile", r.toId)}
                    >
                      <Avatar user={person} size={48} />
                      <span>
                        <PersonName user={person} />
                        <small>
                          @{person?.handle} · {timeAgo(r.createdAt)}
                        </small>
                      </span>
                    </button>
                    <div className="friends-sent-details">
                      <span>
                        {r.requestKnockAccess
                          ? "Asked for knock permission"
                          : "Friend request only"}
                      </span>
                      {r.grantKnockAccess && (
                        <span>Offered access to knock on my room</span>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(
                          act,
                          toast,
                          "friend.cancel",
                          { requestId: r.id },
                          "Friend request cancelled",
                        )
                      }
                    >
                      Cancel request
                    </Button>
                  </article>
                );
              })
            ) : (
              <Empty icon={Send} title="No sent requests">
                Search for someone to send a friend request.
              </Empty>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="friends-result-heading">
            <h2>
              {query.trim()
                ? `Search results${matches.length ? ` (${matches.length})` : ""}`
                : tab === "friends"
                  ? "Your friends"
                  : "People to meet"}
            </h2>
            {query.trim() && (
              <button
                className="social-text-button"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            )}
          </div>
          <div className="friends-grid">
            {visible.map((person) => (
              <FriendCard
                key={person.id}
                person={person}
                data={data}
                act={act}
                toast={toast}
                navigate={navigate}
                onRequest={setRequestPerson}
                onKnock={setKnockPerson}
                onRespond={setRespond}
              />
            ))}
          </div>
          {!visible.length && (
            <Empty
              icon={Users}
              title={query.trim() ? "No people found" : "No friends yet"}
            >
              {query.trim() ? (
                "Try another name or handle."
              ) : (
                <>
                  <p>Friend requests are accepted by both people.</p>
                  <Button onClick={() => setTab("discover")}>
                    <UserPlus size={16} />
                    Find people
                  </Button>
                </>
              )}
            </Empty>
          )}
        </>
      )}
      {requestPerson && (
        <FriendRequestModal
          person={requestPerson}
          act={act}
          toast={toast}
          onClose={() => setRequestPerson(null)}
        />
      )}{" "}
      {knockPerson && (
        <KnockModal
          person={knockPerson}
          act={act}
          toast={toast}
          onClose={() => setKnockPerson(null)}
        />
      )}{" "}
      {respond && (
        <RespondFriendModal
          {...respond}
          act={act}
          toast={toast}
          onClose={() => setRespond(null)}
        />
      )}
    </div>
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
  const own = !selectedId || selectedId === data.user.id,
    person = userById(data, selectedId || data.user.id);
  const [edit, setEdit] = useState(false),
    [friendRequest, setFriendRequest] = useState(false),
    [knock, setKnock] = useState(false),
    [report, setReport] = useState(false),
    [respond, setRespond] = useState(false),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false);
  if (!person)
    return (
      <Empty icon={Users} title="Profile unavailable">
        <Button onClick={() => navigate("people")}>Find people</Button>
      </Empty>
    );
  const incoming = (data.requests || []).find(
    (r) =>
      r.type === "friend" &&
      r.fromId === person.id &&
      r.toId === data.user.id &&
      r.status === "pending",
  );
  return (
    <div className="social-page friends-profile-page">
      <Heading
        eyebrow={own ? "ACCOUNT" : "CONNECTION"}
        title={own ? "My profile" : "Profile"}
        text={
          own
            ? "Manage your basic profile and room permissions."
            : "Get to know someone before requesting a visit."
        }
      />
      <div className="friends-profile-layout">
        <section className="card friends-profile-card">
          <div className="friends-profile-top">
            <div className="friends-profile-avatar">
              <Avatar user={person} size={128} />
            </div>
            <div>
              <h2>
                <PersonName user={person} />
              </h2>
              <p className="friends-profile-handle">@{person.handle}</p>
              {!own && person.isFriend && (
                <Badge tone="sage">
                  <Check size={12} />
                  Friends
                </Badge>
              )}
            </div>
          </div>
          <p className="friends-profile-bio">{person.bio || "No bio yet."}</p>
          {!own && <MutualFriends person={person} navigate={navigate} />}
          <div className="friends-profile-main-actions">
            {own ? (
              <>
                <Button onClick={() => setEdit(true)}>Edit profile</Button>
                <Button variant="secondary" onClick={() => navigate("avatar")}>
                  <Palette size={16} />
                  Edit avatar
                </Button>
                <Button variant="secondary" onClick={() => navigate("room")}>
                  <DoorOpen size={16} />
                  My room
                </Button>
              </>
            ) : person.blocked ? (
              <Button
                variant="secondary"
                onClick={() =>
                  run(
                    act,
                    toast,
                    "block.toggle",
                    { userId: person.id },
                    "Member unblocked",
                  )
                }
              >
                <Shield size={16} />
                Unblock member
              </Button>
            ) : person.isFriend ? (
              <>
                {person.canKnock ? (
                  <Button onClick={() => setKnock(true)}>
                    <DoorOpen size={17} />
                    Knock on room
                  </Button>
                ) : (
                  <span className="friends-profile-locked">
                    <Lock size={15} />
                    They haven’t shared knock permission.
                  </span>
                )}
              </>
            ) : person.friendshipStatus === "incoming" && incoming ? (
              <Button onClick={() => setRespond(true)}>
                Review friend request
              </Button>
            ) : person.friendshipStatus === "outgoing" ? (
              <>
                <Badge>Friend request pending</Badge>
                <Button
                  variant="secondary"
                  onClick={() =>
                    run(
                      act,
                      toast,
                      "friend.cancel",
                      {
                        requestId:
                          person.outgoingRequestId || person.friendRequestId,
                      },
                      "Friend request cancelled",
                    )
                  }
                >
                  Cancel request
                </Button>
              </>
            ) : (
              <Button onClick={() => setFriendRequest(true)}>
                <UserPlus size={17} />
                Add friend
              </Button>
            )}
          </div>
          {!own && person.isFriend && (
            <div className="friends-profile-access">
              <h3>Permission for your room</h3>
              <KnockAccessToggle person={person} act={act} toast={toast} />
              <p>
                Turning this off also cancels pending knocks. Private content
                still requires approval during a visit.
              </p>
            </div>
          )}
          <div className="friends-private-note">
            <Lock size={16} />
            <span>
              Personal content is shared inside a room only, after the host
              approves access.
            </span>
          </div>
        </section>
        <aside className="stack">
          {own ? (
            <>
              <section className="card friends-profile-side">
                <h3>Privacy & account</h3>
                <p>Choose who can find you and manage your account data.</p>
                <Button
                  variant="secondary"
                  onClick={() => navigate("settings")}
                >
                  <Settings size={16} />
                  Settings
                </Button>
                <Button variant="ghost" onClick={() => navigate("safety")}>
                  <Shield size={16} />
                  Safety & account
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
                    )}{" "}
                    {data.user.googleLinked
                      ? "Google connected"
                      : "Connect Google"}
                  </Button>
                )}
              </section>
              <section className="card friends-profile-side friends-room-note">
                <DoorOpen size={25} />
                <h3>Your room stays private</h3>
                <p>
                  Friendship enables connection. You choose who may knock, who
                  enters, and which objects they can open.
                </p>
                <Button variant="secondary" onClick={() => navigate("people")}>
                  Manage friends <ChevronRight size={15} />
                </Button>
              </section>
            </>
          ) : (
            <section className="card friends-profile-side">
              <h3>Manage this connection</h3>
              {person.isFriend && (
                <button
                  className="social-text-button"
                  onClick={() => setRemove(true)}
                >
                  <UserMinus size={16} />
                  Remove friend
                </button>
              )}
              <button
                className="social-text-button"
                onClick={() => setReport(true)}
              >
                <Flag size={16} />
                Report member
              </button>
              <button
                className="social-text-button"
                onClick={() =>
                  run(
                    act,
                    toast,
                    "block.toggle",
                    { userId: person.id },
                    person.blocked ? "Member unblocked" : "Member blocked",
                  )
                }
              >
                <Shield size={16} />
                {person.blocked ? "Unblock member" : "Block member"}
              </button>
              <p>
                Blocking also removes friendship, room permissions, and active
                access between you.
              </p>
            </section>
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
      )}{" "}
      {friendRequest && (
        <FriendRequestModal
          person={person}
          act={act}
          toast={toast}
          onClose={() => setFriendRequest(false)}
        />
      )}{" "}
      {knock && (
        <KnockModal
          person={person}
          act={act}
          toast={toast}
          onClose={() => setKnock(false)}
        />
      )}{" "}
      {respond && incoming && (
        <RespondFriendModal
          request={incoming}
          person={person}
          act={act}
          toast={toast}
          onClose={() => setRespond(false)}
        />
      )}{" "}
      {report && (
        <ReportModal
          targetType="user"
          targetId={person.id}
          act={act}
          toast={toast}
          onClose={() => setReport(false)}
        />
      )}{" "}
      {remove && (
        <Modal
          title={`Remove ${person.name} as a friend?`}
          onClose={() => setRemove(false)}
        >
          <p>
            This removes both knock permissions and ends active access between
            you. You can send a new friend request later.
          </p>
          <div className="social-modal-actions">
            <Button variant="secondary" onClick={() => setRemove(false)}>
              Keep friend
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await run(
                  act,
                  toast,
                  "friend.remove",
                  { userId: person.id },
                  "Friend removed",
                );
                setBusy(false);
                if (result) setRemove(false);
              }}
            >
              <UserMinus size={16} />
              Remove friend
            </Button>
          </div>
        </Modal>
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
    <Modal title="Edit profile" onClose={onClose}>
      <label className="field">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </label>
      <label className="field">
        Bio
        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          placeholder="What makes your world yours?"
        />
      </label>
      <label className="field">
        Presence
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
        eyebrow="PRIVACY & PREFERENCES"
        title="Settings"
        text="Control discovery, notifications, and accessibility."
      />
      <div className="social-settings-grid">
        <section className="card social-settings-card">
          <div className="social-card-heading">
            <DoorOpen size={23} />
            <div>
              <h2>Connection & privacy</h2>
              <p>Manage how friends can reach you.</p>
            </div>
          </div>
          <label className="field social-knock-setting">
            Who can knock on your door?
            <select
              value={settings.knocks === "nobody" ? "nobody" : "friends"}
              onChange={(e) => update("knocks", e.target.value)}
            >
              <option value="friends">Friends with knock permission</option>
              <option value="nobody">Pause all knocks</option>
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
            label="Contact matching"
            description="Allow people who already know your email to find your profile through opt-in contact matching."
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
              <h2>Appearance & notifications</h2>
              <p>Adjust alerts and accessibility.</p>
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
            <h3>Private room content</h3>
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
        eyebrow="UPDATES"
        title="Notifications"
        text="Friend requests, knocks, and account updates."
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
        <Empty icon={Bell} title="No notifications">
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
        eyebrow="ACCOUNT CONTROLS"
        title="Safety & account"
        text="Manage blocks, reports, and your account data."
      />
      <div className="social-settings-grid">
        <div className="stack">
          <section className="card social-settings-card">
            <div className="social-card-heading">
              <Shield size={23} />
              <div>
                <h2>Your boundaries</h2>
                <p>
                  Blocking removes friendship, knocks, visits, and shared
                  access.
                </p>
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
              <h3>Download account data</h3>
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
            <h3>Private content & chat</h3>
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
                  navigate("room");
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
