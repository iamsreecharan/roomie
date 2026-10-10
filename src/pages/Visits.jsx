import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  DoorOpen,
  FileText,
  Hand,
  Image,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { Avatar, Button, Modal, Empty, Badge, timeAgo } from "../lib.jsx";
import RoomScene from "../components/RoomScene.jsx";
import { MediaCall } from "../components/MediaCall.jsx";
import "./visits.css";

const rights = ["chat", "voice", "screen", "interact", "invite"];
const rightLabels = {
  chat: "Chat",
  voice: "Voice & video",
  screen: "Share screen",
  interact: "Move room items",
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
  id === data.user?.id ? data.user : data.users?.find((user) => user.id === id);
const run = async (act, toast, type, payload = {}, success) => {
  try {
    const result = await act(type, payload);
    if (success) toast(success);
    return result;
  } catch (error) {
    toast(error.message || "Please try again.");
    return null;
  }
};
const roomTitle = (data) =>
  `${userById(data, data.session?.hostId)?.name || "Your friend"}'s room`;
function PermissionFields({ value, onChange }) {
  return (
    <div className="vs-permissions">
      {rights.map((right) => (
        <label key={right}>
          <input
            type="checkbox"
            checked={!!value?.[right]}
            onChange={(event) =>
              onChange({ ...value, [right]: event.target.checked })
            }
          />
          <span>{rightLabels[right]}</span>
        </label>
      ))}
    </div>
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
    <div className="vs-shared-editor">
      {entries.map((entry, i) => (
        <div className="vs-shared-edit-entry" key={entry.id || i}>
          <div className="vs-shared-edit-title">
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
              <label className="vs-shared-task-check">
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
    if (grant) run(act, toast, "resource.close", { resourceId: resource.id });
  };
  return (
    <div className="vs-private-object">
      <div className="vs-private-object-icon">
        <FileText size={20} />
      </div>
      <div>
        <strong>{resource.title}</strong>
        <span>
          {grant
            ? `${grant.scope === "write" ? "Edit" : grant.scope === "once" ? "One-time" : "Read"} access shared`
            : "Private"}
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
              <p>Ask the host to open this. They choose what to share.</p>
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
              <p className="muted">You can edit this during the visit.</p>
              <SharedResourceEditor
                type={resource.type}
                value={draft}
                onChange={setDraft}
              />
              <div className="vs-modal-actions">
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
            <div className="vs-shared-content">
              {Array.isArray(content) ? (
                content.length ? (
                  content.map((entry, i) => (
                    <div key={entry.id || i}>
                      <strong>
                        {entry.title || entry.text || `Item ${i + 1}`}
                      </strong>
                      {entry.title && entry.text && <p>{entry.text}</p>}
                      {entry.date && <small>{entry.date}</small>}
                      {entry.url && resource.type === "memories" && (
                        <img
                          className="vs-shared-photo"
                          src={entry.url}
                          alt={entry.title || "Shared photo"}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
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

export function InviteFriend({ data, act, toast, navigate, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const admitted = new Set(
    data.session?.participants?.map((person) => person.userId) || [],
  );
  const friends = (data.users || []).filter(
    (user) =>
      user.isFriend &&
      !user.blocked &&
      user.id !== data.user.id &&
      !admitted.has(user.id),
  );
  const options = friends
    .filter((user) =>
      `${user.name} @${user.handle}`
        .toLowerCase()
        .includes(query.trim().replace(/^@/, "").toLowerCase()),
    )
    .slice(0, 8);
  const choose = (user) => {
    setSelected(user);
    setQuery(`@${user.handle}`);
  };
  return (
    <Modal title="Invite a friend" onClose={onClose}>
      <form
        className="vs-invite-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!selected || busy) return;
          setBusy(true);
          const result = await run(
            act,
            toast,
            "invite.create",
            { userId: selected.id },
            "Invitation sent.",
          );
          setBusy(false);
          if (result) onClose();
        }}
      >
        <p className="muted">They choose when to join your room.</p>
        <label className="field" htmlFor="vs-friend-search">
          Username
        </label>
        <div className="vs-friend-search">
          <Search size={17} />
          <input
            id="vs-friend-search"
            role="combobox"
            aria-expanded={!selected}
            aria-controls="vs-friend-options"
            aria-autocomplete="list"
            aria-activedescendant={
              !selected && options[activeIndex]
                ? `vs-option-${options[activeIndex].id}`
                : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  Math.min(index + 1, options.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (
                event.key === "Enter" &&
                !selected &&
                options[activeIndex]
              ) {
                event.preventDefault();
                choose(options[activeIndex]);
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Search your friends"
            autoComplete="off"
          />
        </div>
        {selected ? (
          <div className="vs-invite-selection">
            <Avatar user={selected} size={42} />
            <div>
              <strong>{selected.name}</strong>
              <span>@{selected.handle}</span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              aria-label="Choose another friend"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <span className="vs-list-label">
              {query ? "MATCHING FRIENDS" : "YOUR FRIENDS"}
            </span>
            <div
              id="vs-friend-options"
              role="listbox"
              className="vs-friend-options"
            >
              {options.map((user, index) => (
                <button
                  type="button"
                  key={user.id}
                  id={`vs-option-${user.id}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(user)}
                >
                  <Avatar user={user} size={38} />
                  <span>
                    <strong>{user.name}</strong>
                    <small>@{user.handle}</small>
                  </span>
                  <Plus size={15} />
                </button>
              ))}
            </div>
            {!options.length && (
              <p className="vs-invite-empty">
                {friends.length
                  ? "No matching friends."
                  : "Add a friend before inviting them over."}
              </p>
            )}
            {!friends.length && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onClose();
                  navigate("people");
                }}
              >
                <UserPlus size={15} />
                Find friends
              </Button>
            )}
          </>
        )}
        <Button type="submit" disabled={!selected || busy}>
          <Send size={15} />
          {busy ? "Sending…" : "Send invite"}
        </Button>
      </form>
    </Modal>
  );
}

function useVisitChat({ data, socket, toast }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const session = data.session;
  const canChat =
    session?.hostId === data.user.id ||
    !!session?.participants?.find((person) => person.userId === data.user.id)
      ?.permissions?.chat;
  const latest = useRef({ sessionId: session?.id, canChat });
  latest.current = { sessionId: session?.id, canChat };
  useEffect(() => {
    setMessages([]);
    setText("");
    setSending(false);
    if (!socket || !session?.id) return;
    const receive = (message) => {
      if (latest.current.canChat)
        setMessages((current) => [...current.slice(-149), message]);
    };
    const clear = () => {
      setMessages([]);
      setText("");
      setSending(false);
    };
    const permission = (event) => {
      if (event?.permissions?.chat === false) clear();
    };
    socket.on("chat:message", receive);
    socket.on("session:ended", clear);
    socket.on("session:revoked", clear);
    socket.on("session:permissions", permission);
    return () => {
      socket.off("chat:message", receive);
      socket.off("session:ended", clear);
      socket.off("session:revoked", clear);
      socket.off("session:permissions", permission);
    };
  }, [socket, session?.id]);
  useEffect(() => {
    if (!canChat) {
      setMessages([]);
      setText("");
    }
  }, [canChat]);
  const send = (event) => {
    event.preventDefault();
    if (!text.trim() || sending || !canChat) return;
    if (!socket?.connected) return toast("Reconnect to send a message.");
    const sessionId = session?.id;
    setSending(true);
    socket
      .timeout(8000)
      .emit("chat:send", { text: text.trim() }, (error, response) => {
        if (latest.current.sessionId !== sessionId) return;
        setSending(false);
        if (error || !response?.ok)
          toast(response?.error || "Message could not be sent. Try again.");
        else setText("");
      });
  };
  return { messages, text, setText, sending, send, canChat };
}

function VisitChat({ data, chat, mobileOpen, onClose }) {
  const tail = useRef(null),
    panel = useRef(null);
  useEffect(() => {
    tail.current?.scrollIntoView({
      block: "nearest",
      behavior: data.user.settings?.reducedMotion ? "auto" : "smooth",
    });
  }, [chat.messages.length, mobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const before = document.activeElement;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        const elements = [
          ...panel.current.querySelectorAll("button,input,a[href]"),
        ].filter((element) => !element.disabled);
        const first = elements[0],
          last = elements.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [mobileOpen]);
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      className={`vs-chat-panel ${mobileOpen ? "is-mobile-open" : ""}`}
      role={mobileOpen ? "dialog" : undefined}
      aria-modal={mobileOpen ? "true" : undefined}
      aria-label={mobileOpen ? roomTitle(data) : "Room chat"}
    >
      <div className="vs-chat-heading">
        <Avatar user={userById(data, data.session?.hostId)} size={38} />
        <div>
          <h2>{roomTitle(data)}</h2>
          <span>
            {data.session?.participants?.length || 0} people · temporary chat
          </span>
        </div>
        <button
          className="icon-button vs-chat-close"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X size={19} />
        </button>
      </div>
      {!chat.canChat ? (
        <div className="vs-chat-empty">
          <Lock size={25} />
          <strong>Chat is turned off for you.</strong>
          <p>The host can change your permissions.</p>
        </div>
      ) : (
        <>
          <div className="vs-chat-messages">
            {!chat.messages.length && (
              <div className="vs-chat-empty">
                <MessageCircle size={28} />
                <strong>Say hello.</strong>
                <p>Messages disappear when the visit ends.</p>
              </div>
            )}
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={`vs-chat-message ${message.userId === data.user.id ? "mine" : ""}`}
              >
                <Avatar user={userById(data, message.userId)} size={30} />
                <div>
                  <span>
                    {message.userId === data.user.id
                      ? "You"
                      : userById(data, message.userId)?.name || "Guest"}
                  </span>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={tail} />
          </div>
          <form className="vs-chat-compose" onSubmit={chat.send}>
            <input
              aria-label="Chat message"
              value={chat.text}
              onChange={(event) => chat.setText(event.target.value)}
              maxLength={2000}
              placeholder="Message your room…"
            />
            <button
              type="submit"
              disabled={!chat.text.trim() || chat.sending}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </aside>
  );
}

function SessionRoom({ data, act, toast, onPersonClick, onResources }) {
  const room = data.session.room,
    host = data.session.hostId === data.user.id;
  const canInteract =
    host ||
    !!data.session.participants?.find(
      (person) => person.userId === data.user.id,
    )?.permissions?.interact;
  const [editing, setEditing] = useState(false),
    [objects, setObjects] = useState(room.objects || []),
    [selected, setSelected] = useState(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setObjects(room.objects || []);
    setSelected(null);
  }, [room.id, room.version]);
  useEffect(() => {
    if (!canInteract) {
      setEditing(false);
      setObjects(room.objects || []);
    }
  }, [canInteract]);
  const people = (data.session.participants || []).map(
    (person) =>
      userById(data, person.userId) || { id: person.userId, name: "Guest" },
  );
  const changed =
    JSON.stringify(objects) !== JSON.stringify(room.objects || []);
  return (
    <section className="vs-room-scene">
      <RoomScene
        room={{ ...room, objects }}
        user={userById(data, data.session.hostId)}
        participants={people}
        onUserClick={onPersonClick}
        editing={editing && canInteract}
        selected={selected}
        onSelect={setSelected}
        onMove={(id, x, y) =>
          setObjects((current) =>
            current.map((object) =>
              object.id === id ? { ...object, x, y } : object,
            ),
          )
        }
        onObjectClick={(object) => {
          if (
            ["desk", "shelf", "photos", "journal", "memories"].includes(
              object.type,
            )
          )
            onResources();
          else
            toast(
              `${object.type.charAt(0).toUpperCase() + object.type.slice(1)} in ${host ? "your" : "your friend's"} room.`,
            );
        }}
      />
      <div className="vs-scene-toolbar">
        <span>
          <Users size={14} />
          {people.length === 1
            ? "Waiting for company"
            : `${people.length} together`}
        </span>
        {canInteract && (
          <Button
            variant="ghost"
            onClick={() => {
              if (editing) setObjects(room.objects || []);
              setEditing(!editing);
            }}
          >
            <Hand size={14} />
            {editing ? "Cancel arranging" : "Arrange room"}
          </Button>
        )}
        {editing && changed && (
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const result = await run(
                act,
                toast,
                "room.update",
                { roomId: room.id, version: room.version, objects },
                "Room updated.",
              );
              setSaving(false);
              if (result) setEditing(false);
            }}
          >
            {saving ? "Saving…" : "Save room"}
            <Check size={14} />
          </Button>
        )}
      </div>
    </section>
  );
}

export function SharedRoom({
  data,
  act,
  navigate,
  toast,
  socket,
  ownerRoomie,
}) {
  const session = data.session,
    host = session?.hostId === data.user.id;
  const [invite, setInvite] = useState(false),
    [person, setPerson] = useState(null),
    [permissions, setPermissions] = useState(defaultRights),
    [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobile, setMobile] = useState(
      () => window.matchMedia("(max-width: 760px)").matches,
    ),
    [chatOpen, setChatOpen] = useState(false);
  const chat = useVisitChat({ data, socket, toast });
  const admitted = session?.participants?.find(
    (member) => member.userId === data.user.id,
  );
  const canInvite = host || admitted?.permissions?.invite;
  const people = (session?.participants || []).map((member) => ({
    ...member,
    user: userById(data, member.userId),
  }));
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!session?.id || (session.participants?.length || 0) < 2) return;
    const key = `roomverse.chat.opened:${session.id}:${data.user.id}:${admitted?.joinedAt || session.startedAt || "host"}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
    } catch {}
    if (!seen) {
      setChatOpen(true);
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
    }
  }, [
    session?.id,
    session?.participants?.length,
    admitted?.joinedAt,
    data.user.id,
  ]);
  useEffect(() => {
    if (!session?.id) {
      setChatOpen(false);
      setPerson(null);
      setResourcesOpen(false);
    }
  }, [session?.id]);
  if (!session) return null;
  const access = (data.requests || []).filter(
    (request) =>
      request.type === "access" &&
      request.status === "pending" &&
      request.toId === data.user.id,
  );
  const resources = host ? data.resources || [] : session.room?.resources || [];
  const choosePerson = (user) => {
    setPerson(user);
    const member = session.participants.find((item) => item.userId === user.id);
    setPermissions(member?.permissions || defaultRights);
  };
  return (
    <div className="vs-shared-room">
      <header className="vs-session-heading">
        <div>
          <span className="eyebrow">{host ? "YOUR ROOM" : "VISITING"}</span>
          <h1>{roomTitle(data)}</h1>
          <p>
            {people.length === 1
              ? "Your friends can join when you invite them."
              : "Room visit"}
          </p>
        </div>
        <div className="vs-session-actions">
          {canInvite && (
            <Button variant="secondary" onClick={() => setInvite(true)}>
              <UserPlus size={16} />
              Invite
            </Button>
          )}
          <Button
            variant="secondary"
            className="vs-open-chat"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle size={16} />
            Chat
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const result = await run(
                act,
                toast,
                host ? "session.end" : "session.leave",
                {},
                host ? "Room visit ended." : "You left the room.",
              );
              if (result) navigate("room");
            }}
          >
            <LogOut size={16} />
            {host ? "End visit" : "Leave"}
          </Button>
        </div>
      </header>
      <div className="vs-room-layout">
        <div className="vs-room-main">
          <SessionRoom
            data={data}
            act={act}
            toast={toast}
            onPersonClick={choosePerson}
            onResources={() => {
              setResourcesOpen(true);
              window.setTimeout(
                () =>
                  document.getElementById("vs-room-resources")?.scrollIntoView({
                    block: "start",
                    behavior: data.user.settings?.reducedMotion
                      ? "auto"
                      : "smooth",
                  }),
                20,
              );
            }}
          />
          <div className="vs-people-strip">
            {people.map((member) => (
              <button
                key={member.userId}
                onClick={() =>
                  choosePerson(
                    member.user || { id: member.userId, name: "Guest" },
                  )
                }
              >
                <Avatar user={member.user} size={32} />
                <span>
                  {member.userId === data.user.id
                    ? "You"
                    : member.user?.name?.split(" ")[0] || "Guest"}
                </span>
                {member.userId === session.hostId && <small>Host</small>}
              </button>
            ))}
          </div>
          {host && ownerRoomie && (
            <div className="vs-owner-roomie">{ownerRoomie}</div>
          )}
          {host && (
            <section className="vs-private-tools">
              <h2>Private tools</h2>
              <div>
                {(data.resources || []).map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() => navigate("tools", resource.type)}
                  >
                    {resource.type === "memories" ? (
                      <Image size={19} />
                    ) : (
                      <FileText size={19} />
                    )}
                    <span>
                      {{
                        tasks: "Tasks",
                        journal: "Journal",
                        planner: "Calendar",
                        memories: "Photos",
                        whiteboard: "Whiteboard",
                      }[resource.type] || resource.title}
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="vs-room-tools">
            <button
              className={`vs-resource-toggle ${resourcesOpen ? "active" : ""}`}
              onClick={() => setResourcesOpen(!resourcesOpen)}
            >
              <Lock size={17} />
              <span>{host ? "Sharing requests" : "Ask to open something"}</span>
              {access.length > 0 && <b>{access.length}</b>}
              <ChevronDown size={15} />
            </button>
            <details className="vs-call-controls">
              <summary>
                <Video size={17} />
                <span>Voice & video</span>
                <ChevronDown size={15} />
              </summary>
              <MediaCall data={data} act={act} socket={socket} toast={toast} />
            </details>
          </div>
          {(resourcesOpen || (host && access.length > 0)) && (
            <section className="vs-resource-panel" id="vs-room-resources">
              <div className="vs-resource-heading">
                <Lock size={16} />
                <h2>{host ? "Sharing requests" : "Private content"}</h2>
              </div>
              {host ? (
                <>
                  <p className="muted">
                    Photos and personal notes stay private until you approve a
                    request.
                  </p>
                  {access.map((request) => {
                    const user = userById(data, request.fromId),
                      resource = resources.find(
                        (item) => item.id === request.resourceId,
                      );
                    return (
                      <article className="vs-access-request" key={request.id}>
                        <Avatar user={user} size={36} />
                        <div>
                          <strong>{user?.name || "A guest"}</strong>
                          <p>
                            Would like to open{" "}
                            {resource?.title || "a private item"}.
                          </p>
                          <div className="vs-access-actions">
                            {[
                              ["once", "View once"],
                              ["read", "Read"],
                              ["write", "Read & edit"],
                              ["deny", "Reject"],
                            ].map(([scope, label]) => (
                              <Button
                                key={scope}
                                variant="secondary"
                                onClick={() =>
                                  run(
                                    act,
                                    toast,
                                    "resource.grant",
                                    { requestId: request.id, scope },
                                    scope === "deny"
                                      ? "Request rejected."
                                      : "Access shared for this visit.",
                                  )
                                }
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {!access.length && (
                    <p className="vs-no-requests">No requests right now.</p>
                  )}
                  {(session.grants || [])
                    .filter((grant) => grant.userId !== data.user.id)
                    .map((grant) => (
                      <div
                        className="vs-active-grant"
                        key={`${grant.resourceId}:${grant.userId}`}
                      >
                        <span>
                          {userById(data, grant.userId)?.name} ·{" "}
                          {resources.find(
                            (item) => item.id === grant.resourceId,
                          )?.title || "Shared item"}
                          <small>
                            {grant.scope === "write"
                              ? "Can edit"
                              : grant.scope === "once"
                                ? "View once"
                                : "Can read"}
                          </small>
                        </span>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            run(
                              act,
                              toast,
                              "resource.revoke",
                              {
                                resourceId: grant.resourceId,
                                userId: grant.userId,
                              },
                              "Access removed.",
                            )
                          }
                        >
                          <Lock size={13} />
                          Revoke
                        </Button>
                      </div>
                    ))}
                </>
              ) : (
                <>
                  <p className="muted">
                    Ask the host before opening photos, notes, or other personal
                    content.
                  </p>
                  {resources.map((resource) => (
                    <GuestResource
                      key={`${session.id}:${resource.id}`}
                      resource={resource}
                      session={session}
                      data={data}
                      act={act}
                      toast={toast}
                      socket={socket}
                    />
                  ))}
                  {!resources.length && (
                    <p className="muted">Nothing to request in this room.</p>
                  )}
                </>
              )}
            </section>
          )}
        </div>
        <VisitChat
          data={data}
          chat={chat}
          mobileOpen={mobile && chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
      {invite && (
        <InviteFriend
          data={data}
          act={act}
          toast={toast}
          navigate={navigate}
          onClose={() => setInvite(false)}
        />
      )}
      {person && (
        <Modal
          title={
            person.id === data.user.id
              ? "You in this room"
              : person.name || "Your guest"
          }
          onClose={() => setPerson(null)}
        >
          <div className="vs-person-modal">
            <Avatar user={person} size={72} />
            <div>
              <strong>{person.name}</strong>
              <span>@{person.handle}</span>
            </div>
          </div>
          {person.id !== data.user.id && (
            <div className="vs-person-profile">
              <p className="muted">{person.mutualCount || 0} mutual friends</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setPerson(null);
                  navigate("profile", person.id);
                }}
              >
                View profile
                <ArrowUpRight size={15} />
              </Button>
            </div>
          )}
          {host && person.id !== data.user.id ? (
            <>
              <p className="muted">
                Choose what your guest can do in this room.
              </p>
              <PermissionFields value={permissions} onChange={setPermissions} />
              <div className="vs-person-actions">
                <Button
                  onClick={async () => {
                    const result = await run(
                      act,
                      toast,
                      "session.permissions",
                      { userId: person.id, permissions },
                      "Permissions updated.",
                    );
                    if (result) setPerson(null);
                  }}
                >
                  Save permissions
                  <Check size={15} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const result = await run(
                      act,
                      toast,
                      "session.remove",
                      { userId: person.id },
                      "Guest removed.",
                    );
                    if (result) setPerson(null);
                  }}
                >
                  <UserMinus size={15} />
                  Remove guest
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                {person.id === session.hostId
                  ? "Room host"
                  : person.id === data.user.id
                    ? "You're part of this visit."
                    : "Visiting together."}
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

export const ActiveRoom = SharedRoom;
export const RoomSession = SharedRoom;

export function VisitsPage({ data, act, navigate, toast, socket, selectedId }) {
  const [tab, setTab] = useState("incoming"),
    [invite, setInvite] = useState(selectedId === "invite"),
    [busyRequest, setBusyRequest] = useState(null);
  const mine = data.user.id;
  const visits = (data.requests || []).filter((request) =>
    ["knock", "invite"].includes(request.type),
  );
  const incoming = visits.filter(
      (request) => request.status === "pending" && request.toId === mine,
    ),
    outgoing = visits.filter(
      (request) => request.status === "pending" && request.fromId === mine,
    );
  const ready = (data.myVisits || []).filter(
    (request) =>
      request.status === "accepted" &&
      ((request.type === "invite" && request.toId === mine) ||
        (request.type === "knock" && request.fromId === mine)),
  );
  const list =
    tab === "incoming" ? incoming : tab === "outgoing" ? outgoing : ready;
  const respond = async (request, accept) => {
    setBusyRequest(request.id);
    const result = await run(
      act,
      toast,
      "request.respond",
      {
        requestId: request.id,
        accept,
        ...(request.type === "knock" && accept
          ? { permissions: defaultRights }
          : {}),
      },
      accept
        ? request.type === "knock"
          ? "Accepted. Your friend can join now."
          : "Invitation accepted. Join when you're ready."
        : "Request rejected.",
    );
    setBusyRequest(null);
    if (result && request.type === "invite" && accept) setTab("ready");
  };
  return (
    <div className="vs-page">
      {data.session && (
        <SharedRoom
          data={data}
          act={act}
          navigate={navigate}
          toast={toast}
          socket={socket}
        />
      )}
      <header
        className={`vs-page-heading ${data.session ? "has-session" : ""}`}
      >
        <div>
          <span className="eyebrow">
            {data.session ? "AT YOUR DOOR" : "VISITS"}
          </span>
          <h1>{data.session ? "Knocks & invites" : "Invites & knocks"}</h1>
          <p>
            {data.session
              ? "You decide who joins your room."
              : "Invite a friend, or answer a knock."}
          </p>
        </div>
        {!data.session && (
          <Button onClick={() => setInvite(true)}>
            <UserPlus size={16} />
            Invite a friend
          </Button>
        )}
      </header>
      <div className="vs-request-tabs tabs">
        {[
          ["incoming", "Incoming", incoming.length],
          ["outgoing", "Sent", outgoing.length],
          ["ready", "Ready to join", ready.length],
        ].map(([id, label, total]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
            {total > 0 && <span>{total}</span>}
          </button>
        ))}
      </div>
      <div className="vs-request-list">
        {list.map((request) => {
          const person = userById(
            data,
            request.fromId === mine ? request.toId : request.fromId,
          );
          const pending = busyRequest === request.id;
          return (
            <article className="vs-request" key={request.id}>
              <Avatar user={person} size={48} />
              <div className="vs-request-copy">
                <strong>{person?.name || "Your friend"}</strong>
                <span>@{person?.handle || "friend"}</span>
                <p>
                  {request.type === "invite"
                    ? tab === "outgoing"
                      ? "Invited to your room"
                      : tab === "ready"
                        ? "Your invitation is ready"
                        : "Invited you to their room"
                    : request.message
                      ? `“${request.message}”`
                      : "Knocked on your door"}
                </p>
                <small>{timeAgo(request.createdAt)}</small>
              </div>
              <div className="vs-request-actions">
                {tab === "incoming" ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => respond(request, false)}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => respond(request, true)}
                    >
                      {pending ? "Opening…" : "Accept"}
                      <Check size={14} />
                    </Button>
                  </>
                ) : tab === "outgoing" ? (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={async () => {
                      setBusyRequest(request.id);
                      await run(
                        act,
                        toast,
                        "request.cancel",
                        { requestId: request.id },
                        "Cancelled.",
                      );
                      setBusyRequest(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    disabled={!!data.session || pending}
                    onClick={async () => {
                      setBusyRequest(request.id);
                      const result = await run(act, toast, "session.join", {
                        requestId: request.id,
                      });
                      setBusyRequest(null);
                      if (result) navigate("room");
                    }}
                  >
                    Join room
                    <DoorOpen size={15} />
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && (
        <Empty
          icon={tab === "outgoing" ? Send : DoorOpen}
          title={
            tab === "incoming"
              ? "No knocks right now."
              : tab === "outgoing"
                ? "Nothing waiting."
                : "No visits ready yet."
          }
        >
          {tab === "incoming"
            ? "Requests from your friends will appear here."
            : tab === "outgoing"
              ? "Invitations you send appear here."
              : "Once a knock or invitation is accepted, you can join here."}
        </Empty>
      )}
      {invite && (
        <InviteFriend
          data={data}
          act={act}
          toast={toast}
          navigate={navigate}
          onClose={() => setInvite(false)}
        />
      )}
    </div>
  );
}
