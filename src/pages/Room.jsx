import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  CornerDownLeft,
  Download,
  Ellipsis,
  Eye,
  Image,
  LayoutGrid,
  LockKeyhole,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  RotateCw,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { Avatar, Badge, Button, Empty, Modal } from "../lib.jsx";
import { avatarOptions } from "../components/Avatar.jsx";
import RoomScene, { roomObjectDefaults } from "../components/RoomScene.jsx";
import "./room.css";

const themes = [
  { id: "sage", name: "Sunday sage", color: "#b5c9b9" },
  { id: "clay", name: "Warm terracotta", color: "#d5ac96" },
  { id: "lavender", name: "Lavender hour", color: "#bdb2d0" },
  { id: "midnight", name: "After hours", color: "#5d6e7d" },
];
const toolInfo = {
  tasks: {
    label: "Little to-dos",
    title: "Tasks",
    icon: CheckCheck,
    subtitle: "Make room for the things that matter.",
    color: "sage",
  },
  journal: {
    label: "Dear diary",
    title: "Journal",
    icon: BookOpen,
    subtitle: "A soft landing for your thoughts.",
    color: "peach",
  },
  planner: {
    label: "Your days",
    title: "Calendar",
    icon: CalendarDays,
    subtitle: "A little intention for the days ahead.",
    color: "lavender",
  },
  memories: {
    label: "Good little moments",
    title: "Memories",
    icon: Image,
    subtitle: "Some moments deserve a place to stay.",
    color: "sand",
  },
  whiteboard: {
    label: "Room to think",
    title: "Whiteboard",
    icon: StickyNote,
    subtitle: "Let your ideas wander a little.",
    color: "blue",
  },
};
const uid = () => crypto.randomUUID();
const clone = (value) => JSON.parse(JSON.stringify(value));
const initialContent = (type) => (type === "whiteboard" ? { text: "" } : []);
const dateLabel = (date) =>
  new Date(`${date?.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function RoomiePanel({ data, act, toast, navigate, compact = false }) {
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  async function preview(event, text = prompt) {
    event?.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setProposal(null);
    try {
      const response = await act("roomie.preview", { prompt: text.trim() });
      setProposal(response.proposal);
      setPreviewVersion(data.room.version);
      setPrompt(text);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    try {
      const result = await act("roomie.apply", {
        proposal,
        version: previewVersion,
      });
      setProposal(null);
      setPrompt("");
      toast(
        proposal.action === "host"
          ? "Your room is open for a little company."
          : proposal.action === "open_resource"
            ? "Your private corner is ready."
            : "A little refresh, just for you.",
      );
      if (result.navigate && navigate)
        navigate(result.navigate, result.resourceType);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`roomie-panel ${compact ? "roomie-compact" : ""}`}
      aria-label="Roomie assistant"
    >
      <div className="roomie-heading">
        <span className="roomie-mark">
          <Sparkles size={22} />
        </span>
        <div>
          <h3>A little help from Roomie</h3>
          <p>Your space, with a touch of magic.</p>
        </div>
        <span className="roomie-dot" title="Ready to help" />
      </div>
      {!compact && (
        <p className="roomie-intro">
          A new mood, a fresh arrangement, or a little plan for your day. Just
          say the word.
        </p>
      )}
      <form className="roomie-input" onSubmit={preview}>
        <textarea
          aria-label="Ask Roomie"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Make my room feel a little cozier…"
          maxLength={500}
          rows={compact ? 2 : 3}
        />
        <button
          className="roomie-send"
          type="submit"
          aria-label="Preview Roomie's suggestion"
          disabled={busy || !prompt.trim()}
        >
          {busy ? <span className="room-spinner" /> : <ArrowUp size={18} />}
        </button>
      </form>
      {!proposal && (
        <div className="roomie-suggestions">
          {[
            { label: "A lavender mood", prompt: "A lavender mood" },
            {
              label: "A little to-do",
              prompt: "Add a task: Take a mindful break",
            },
            {
              label: "Sunset palette",
              prompt: "Give my room a warm sunset palette",
            },
          ].map((item) => (
            <button
              key={item.label}
              disabled={busy}
              onClick={() => preview(null, item.prompt)}
            >
              <Sparkles size={12} />
              {item.label}
            </button>
          ))}
        </div>
      )}
      {proposal && (
        <div className="roomie-proposal">
          <span className="eyebrow">
            <Eye size={13} /> YOUR PREVIEW
          </span>
          <p>{proposal.message || "Your new room is ready to preview."}</p>
          {proposal.action === "room" && (
            <div className="roomie-scene-preview">
              <RoomScene
                room={{
                  ...data.room,
                  theme: proposal.theme || data.room.theme,
                  objects: proposal.objects || data.room.objects,
                }}
                user={data.user}
                compact
              />
            </div>
          )}
          {proposal.theme && (
            <span className="roomie-proposal-tag">
              Palette:{" "}
              {themes.find((theme) => theme.id === proposal.theme)?.name ||
                proposal.theme}
            </span>
          )}
          {proposal.tasks?.length > 0 && (
            <ul>
              {proposal.tasks.map((task, index) => (
                <li key={index}>
                  {typeof task === "string" ? task : task.text || task.title}
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <Button onClick={apply} disabled={busy}>
              <Check size={15} />
              Apply changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => setProposal(null)}
              disabled={busy}
            >
              Dismiss
            </Button>
          </div>
          <small>Nothing changes until you apply.</small>
        </div>
      )}
      <div className="roomie-footnote">
        <ShieldCheck size={13} />
        <span>Only you can see your Roomie conversations.</span>
      </div>
    </section>
  );
}

export function RoomPage({ data, act, navigate, toast }) {
  const room = data.room;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => clone(room));
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [inspect, setInspect] = useState(null);
  const [showFurniture, setShowFurniture] = useState(false);
  const sceneRoom = editing ? draft : room;
  useEffect(() => {
    if (!editing) setDraft(clone(room));
  }, [room.version, editing]);
  const selectedObject = draft.objects.find((object) => object.id === selected);
  const completed = (
    data.resources.find((resource) => resource.type === "tasks")?.content || []
  ).filter((task) => task.done).length;
  const tasks = (
    data.resources.find((resource) => resource.type === "tasks")?.content || []
  ).length;
  function beginEdit(id) {
    setDraft(clone(room));
    setEditing(true);
    setSelected(id || null);
  }
  function moveObject(id, x, y) {
    setDraft((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === id
          ? {
              ...object,
              x: Math.max(8, Math.min(90, x)),
              y: Math.max(18, Math.min(88, y)),
            }
          : object,
      ),
    }));
  }
  function changeObject(patch) {
    setDraft((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === selected ? { ...object, ...patch } : object,
      ),
    }));
  }
  function addObject(type) {
    const object = {
      id: uid(),
      type,
      ...roomObjectDefaults[type],
      rotation: 0,
    };
    setDraft((current) => ({
      ...current,
      objects: [...current.objects, object],
    }));
    setSelected(object.id);
    setShowFurniture(false);
  }
  async function save() {
    setBusy(true);
    try {
      await act("room.update", {
        version: draft.version,
        theme: draft.theme,
        objects: draft.objects,
      });
      setEditing(false);
      toast("Your room feels a little more you.");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function undo() {
    setBusy(true);
    try {
      await act("room.undo");
      toast("Your previous room is back.");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function host() {
    setBusy(true);
    try {
      if (!data.session) await act("session.start");
      navigate("visits");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="room-page">
      <div className="page-heading room-page-heading">
        <div>
          <span className="eyebrow">A CORNER OF THE WORLD, JUST FOR YOU</span>
          <h1>
            My room<span className="heading-dot">.</span>
          </h1>
          <p>A little space, entirely yours.</p>
        </div>
        <div className="room-top-actions">
          <Button variant="secondary" onClick={host} disabled={busy}>
            <Users size={16} />
            {data.session ? "Your gathering" : "Invite someone in"}
          </Button>
          <Button
            onClick={() => (editing ? save() : beginEdit())}
            disabled={busy}
          >
            {editing ? <Check size={16} /> : <SlidersHorizontal size={16} />}
            {editing ? "Save my room" : "Make it yours"}
          </Button>
        </div>
      </div>
      <div className="room-main-grid">
        <div className="room-main-column">
          <section className={`room-stage-card ${editing ? "is-editing" : ""}`}>
            <div className="room-stage-heading">
              <div>
                <span className="room-stage-label">
                  <span className="live-dot" />
                  {data.user.name.split(" ")[0]}'s little world
                </span>
                <span className="room-stage-theme">
                  {themes.find((theme) => theme.id === sceneRoom.theme)?.name ||
                    "Sunday sage"}
                </span>
              </div>
              <span className="room-privacy">
                <LockKeyhole size={12} />
                Your private room
              </span>
            </div>
            <div className="room-illustration">
              <RoomScene
                room={sceneRoom}
                user={data.user}
                editing={editing}
                selected={selected}
                onSelect={setSelected}
                onMove={moveObject}
                onObjectClick={(object) =>
                  object.type === "desk"
                    ? navigate("tools")
                    : setInspect(object)
                }
              />
              <span className="room-sunlight-note">
                <span>☀︎</span> The light feels good in here.
              </span>
              {editing && (
                <span className="room-edit-hint">
                  <Pencil size={13} />
                  Drag furniture, or select it and use arrow keys
                </span>
              )}
            </div>
            <div className="room-stage-footer">
              <div className="room-owner">
                <Avatar user={data.user} size={35} />
                <div>
                  <strong>Home, sweet home.</strong>
                  <span>
                    {data.session
                      ? `${data.session.participants.length} ${data.session.participants.length === 1 ? "person" : "people"} hanging out`
                      : "A little peace. A lot of possibility."}
                  </span>
                </div>
              </div>
              <button
                className="room-scene-shortcut"
                onClick={() => navigate("tools")}
              >
                <span>Your desk, your thoughts</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
          {editing && (
            <section className="room-editor card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">A SPACE THAT FEELS LIKE YOU</span>
                  <h3>Make yourself at home</h3>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  <X size={15} />
                  Cancel
                </Button>
              </div>
              <div className="room-theme-options">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    className={draft.theme === theme.id ? "active" : ""}
                    onClick={() =>
                      setDraft((current) => ({ ...current, theme: theme.id }))
                    }
                  >
                    <span style={{ background: theme.color }} />
                    {theme.name}
                    {draft.theme === theme.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="room-editor-objects">
                {draft.objects.map((object) => (
                  <button
                    key={object.id}
                    className={selected === object.id ? "active" : ""}
                    onClick={() => setSelected(object.id)}
                  >
                    {object.type.replace("shelf", "bookcase")}
                  </button>
                ))}
                <button
                  className="add-furniture"
                  onClick={() => setShowFurniture(true)}
                >
                  <Plus size={14} />
                  Furniture
                </button>
              </div>
              {selectedObject && (
                <div className="room-object-controls">
                  <label>
                    Color
                    <input
                      aria-label={`${selectedObject.type} color`}
                      type="color"
                      value={selectedObject.color || "#a4b095"}
                      onChange={(event) =>
                        changeObject({ color: event.target.value })
                      }
                    />
                  </label>
                  <div className="room-position-controls">
                    <button
                      className="icon-button"
                      aria-label="Move left"
                      onClick={() =>
                        moveObject(
                          selected,
                          selectedObject.x - 1,
                          selectedObject.y,
                        )
                      }
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move up"
                      onClick={() =>
                        moveObject(
                          selected,
                          selectedObject.x,
                          selectedObject.y - 1,
                        )
                      }
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move down"
                      onClick={() =>
                        moveObject(
                          selected,
                          selectedObject.x,
                          selectedObject.y + 1,
                        )
                      }
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move right"
                      onClick={() =>
                        moveObject(
                          selected,
                          selectedObject.x + 1,
                          selectedObject.y,
                        )
                      }
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      changeObject({
                        rotation: (selectedObject.rotation + 15) % 360,
                      })
                    }
                  >
                    <RotateCw size={14} />
                    Rotate
                  </Button>
                  <button
                    className="icon-button room-delete"
                    aria-label={`Remove ${selectedObject.type}`}
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        objects: current.objects.filter(
                          (object) => object.id !== selected,
                        ),
                      }));
                      setSelected(null);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className="room-editor-bottom">
                <span>Changes stay private. Save when it feels right.</span>
                <Button onClick={save} disabled={busy}>
                  <Check size={15} />
                  Save changes
                </Button>
              </div>
            </section>
          )}
          <section className="room-tools-section">
            <div className="room-section-heading">
              <div>
                <span className="eyebrow">JUST AROUND THE CORNER</span>
                <h2>Your little essentials</h2>
              </div>
              <span>
                <LockKeyhole size={12} />
                Always private
              </span>
            </div>
            <div className="room-tool-shortcuts">
              {Object.entries(toolInfo).map(([type, info]) => {
                const Icon = info.icon;
                const resource = data.resources.find(
                  (item) => item.type === type,
                );
                const count = Array.isArray(resource?.content)
                  ? resource.content.length
                  : null;
                return (
                  <button
                    key={type}
                    className={`room-tool-shortcut ${info.color}`}
                    onClick={() => navigate("tools", type)}
                  >
                    <span className="room-tool-icon">
                      <Icon size={22} strokeWidth={1.6} />
                    </span>
                    <strong>{info.title}</strong>
                    <span>
                      {type === "tasks"
                        ? `${completed} of ${tasks} complete`
                        : count !== null
                          ? `${count} ${type === "planner" ? "plans" : type === "journal" ? "entries" : "moments"}`
                          : "Catch an idea"}
                    </span>
                    <ArrowRight className="room-tool-arrow" size={15} />
                  </button>
                );
              })}
            </div>
          </section>
          <div className="room-kind-note">
            <span className="room-kind-star">✳︎</span>
            <p>
              Your room is for living, not performing.{" "}
              <strong>Come as you are.</strong>
            </p>
            {room.history && (
              <button onClick={undo} disabled={busy}>
                <Undo2 size={14} />
                Undo last room change
              </button>
            )}
          </div>
        </div>
        <aside className="room-side-column">
          <section className="room-avatar-card">
            <div className="room-avatar-card-top">
              <span className="eyebrow">HEY, THAT'S YOU</span>
              <span className="room-small-spark">✳︎</span>
            </div>
            <div className="room-avatar-art">
              <span className="avatar-orbit orbit-one" />
              <span className="avatar-orbit orbit-two" />
              <Avatar user={data.user} size={148} />
              <span className="avatar-decoration decor-one">✦</span>
              <span className="avatar-decoration decor-two">✦</span>
            </div>
            <h3>{data.user.name.split(" ")[0]}, in your element.</h3>
            <p>A little character. A lot of you.</p>
            <Button variant="secondary" onClick={() => navigate("avatar")}>
              <Palette size={15} />
              Style your avatar
              <ArrowRight size={15} />
            </Button>
          </section>
          <RoomiePanel
            data={data}
            act={act}
            toast={toast}
            navigate={navigate}
            compact
          />
          <section className="room-presence-note">
            <Coffee size={19} />
            <div>
              <strong>No rush. You're home.</strong>
              <p>Settle in, make something, or simply be.</p>
            </div>
          </section>
        </aside>
      </div>
      {showFurniture && (
        <Modal
          title="A little something for your room"
          onClose={() => setShowFurniture(false)}
        >
          <p className="muted">Pick a piece, then find its perfect spot.</p>
          <div className="furniture-picker">
            {Object.keys(roomObjectDefaults).map((type) => (
              <button key={type} onClick={() => addObject(type)}>
                <span className="furniture-picker-icon">
                  {type === "plant" ? (
                    <Sparkles />
                  ) : type === "art" ? (
                    <Image />
                  ) : type === "desk" ? (
                    <LayoutGrid />
                  ) : type === "lamp" ? (
                    <Coffee />
                  ) : (
                    <Plus />
                  )}
                </span>
                {type === "shelf"
                  ? "Bookcase"
                  : type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {inspect && (
        <Modal
          title={`Your ${inspect.type === "shelf" ? "bookcase" : inspect.type}`}
          onClose={() => setInspect(null)}
        >
          <div className="room-inspect-preview">
            <RoomScene
              room={{
                ...room,
                objects: room.objects.filter(
                  (object) => object.id === inspect.id,
                ),
              }}
              user={data.user}
              compact
            />
          </div>
          <p className="muted">
            A little piece of your world. Move it, recolor it, or give your room
            a new mood.
          </p>
          <Button
            onClick={() => {
              beginEdit(inspect.id);
              setInspect(null);
            }}
          >
            <Pencil size={16} />
            Make it yours
          </Button>
        </Modal>
      )}
    </div>
  );
}

export function AvatarPage({ data, act, navigate, toast }) {
  const [config, setConfig] = useState({ ...data.user.avatar });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("look");
  const changed = JSON.stringify(config) !== JSON.stringify(data.user.avatar);
  useEffect(
    () => setConfig({ ...data.user.avatar }),
    [JSON.stringify(data.user.avatar)],
  );
  async function save() {
    setBusy(true);
    try {
      await act("profile.update", { avatar: config });
      toast("Looking good. Your new avatar is saved.");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  const choose = (key, value) =>
    setConfig((current) => ({ ...current, [key]: value }));
  function randomize() {
    const pick = (options) =>
      options[Math.floor(Math.random() * options.length)];
    setConfig({
      skin: pick(Object.values(avatarOptions.skin)),
      hair: pick(Object.values(avatarOptions.hair)),
      hairStyle: pick(["waves", "bob", "curls", "crop", "braids"]),
      outfit: pick(Object.values(avatarOptions.outfit)),
      accessory: pick(["none", "glasses", "earrings", "headphones", "cap"]),
    });
  }
  return (
    <div className="avatar-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE CHARACTER, A LOT OF YOU</span>
          <h1>
            Your kind of character<span className="heading-dot">.</span>
          </h1>
          <p>Dress for yourself. The rest is just a bonus.</p>
        </div>
        <Button onClick={save} disabled={busy || !changed}>
          <Check size={16} />
          {busy ? "Saving…" : "Save your look"}
        </Button>
      </div>
      <div className="avatar-designer-grid">
        <section className="avatar-large-preview">
          <span className="avatar-preview-label">
            NICE TO MEET YOU, {data.user.name.split(" ")[0].toUpperCase()}
          </span>
          <div className="avatar-preview-halo">
            <span className="avatar-preview-spark spark-a">✦</span>
            <span className="avatar-preview-spark spark-b">✳︎</span>
            <Avatar config={config} size={300} />
          </div>
          <h2>Entirely, wonderfully you.</h2>
          <p>One-of-a-kind looks for your little world.</p>
          <Button variant="secondary" onClick={randomize}>
            <WandSparkles size={16} />
            Surprise me
          </Button>
          <div className="avatar-preview-small">
            <Avatar config={config} size={40} />
            <Avatar config={config} size={56} />
            <Avatar config={config} size={76} />
            <span>Good at every size.</span>
          </div>
        </section>
        <section className="avatar-customizer card">
          <div className="tabs">
            <button
              className={tab === "look" ? "active" : ""}
              onClick={() => setTab("look")}
            >
              Your look
            </button>
            <button
              className={tab === "style" ? "active" : ""}
              onClick={() => setTab("style")}
            >
              Your style
            </button>
          </div>
          {tab === "look" ? (
            <>
              <ColorChoices
                label="Skin tone"
                value={config.skin}
                options={avatarOptions.skin}
                onChange={(value) => choose("skin", value)}
              />
              <div className="avatar-choice-section">
                <h3>Hair, with personality</h3>
                <p>A good hair day, every day.</p>
                <div className="hair-style-options">
                  {["waves", "bob", "curls", "crop", "braids"].map((style) => (
                    <button
                      key={style}
                      className={config.hairStyle === style ? "active" : ""}
                      onClick={() => choose("hairStyle", style)}
                      aria-pressed={config.hairStyle === style}
                    >
                      <Avatar
                        config={{
                          ...config,
                          hairStyle: style,
                          accessory: "none",
                        }}
                        size={68}
                      />
                      <span>
                        {style === "waves"
                          ? "The wave"
                          : style === "bob"
                            ? "Soft bob"
                            : style === "curls"
                              ? "Cloud curls"
                              : style === "crop"
                                ? "Fresh crop"
                                : "Braided"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <ColorChoices
                label="Hair color"
                value={config.hair}
                options={avatarOptions.hair}
                onChange={(value) => choose("hair", value)}
              />
            </>
          ) : (
            <>
              <ColorChoices
                label="Your favorite color, worn well"
                value={config.outfit}
                options={avatarOptions.outfit}
                onChange={(value) => choose("outfit", value)}
              />
              <div className="avatar-choice-section">
                <h3>The finishing touch</h3>
                <p>Small details. Big you energy.</p>
                <div className="avatar-accessories">
                  {[
                    { id: "none", label: "Keep it simple" },
                    { id: "glasses", label: "Round frames" },
                    { id: "earrings", label: "Golden hoops" },
                    { id: "headphones", label: "In my own world" },
                    { id: "cap", label: "Off-duty cap" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className={config.accessory === item.id ? "active" : ""}
                      onClick={() => choose("accessory", item.id)}
                    >
                      <Avatar
                        config={{ ...config, accessory: item.id }}
                        size={64}
                      />
                      <span>{item.label}</span>
                      {config.accessory === item.id && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="avatar-customizer-footer">
            <span>
              <ShieldCheck size={15} />
              Your avatar travels with you.
            </span>
            <Button
              variant="ghost"
              disabled={!changed}
              onClick={() => setConfig({ ...data.user.avatar })}
            >
              <Undo2 size={15} />
              Reset
            </Button>
          </div>
        </section>
      </div>
      <button className="room-back-link" onClick={() => navigate("room")}>
        <ArrowLeft size={15} />
        Back to your room
      </button>
    </div>
  );
}

function ColorChoices({ label, value, options, onChange }) {
  return (
    <div className="avatar-choice-section">
      <h3>{label}</h3>
      <div className="avatar-color-options">
        {Object.entries(options).map(([key, color]) => {
          const active = key === value || color === value;
          return (
            <button
              key={key}
              style={{ "--swatch": color }}
              title={key}
              aria-label={`${label}: ${key}`}
              aria-pressed={active}
              className={active ? "active" : ""}
              onClick={() => onChange(color)}
            >
              {active && <Check size={18} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ToolsPage({ data, act, navigate, toast, selectedId }) {
  const [type, setType] = useState(toolInfo[selectedId] ? selectedId : "tasks");
  const resource = data.resources.find((item) => item.type === type);
  const [content, setContent] = useState(() =>
    clone(resource?.content || initialContent(type)),
  );
  const [busy, setBusy] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [filter, setFilter] = useState("all");
  const [entry, setEntry] = useState(null);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadRef = useRef();
  const info = toolInfo[type],
    Icon = info.icon;
  useEffect(() => {
    if (toolInfo[selectedId]) setType(selectedId);
  }, [selectedId]);
  useEffect(() => {
    setContent(clone(resource?.content || initialContent(type)));
    setFilter("all");
    setEntry(null);
  }, [resource?.id, JSON.stringify(resource?.content)]);
  async function persist(next, message) {
    if (!resource) {
      toast("This private tool is not available yet.");
      return false;
    }
    const previous = content;
    setContent(next);
    setBusy(true);
    try {
      await act("resource.save", { resourceId: resource.id, content: next });
      if (message) toast(message);
      return true;
    } catch (error) {
      setContent(previous);
      toast(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function addTask(event) {
    event.preventDefault();
    if (!taskText.trim()) return;
    if (
      await persist([
        ...content,
        { id: uid(), text: taskText.trim(), done: false },
      ])
    )
      setTaskText("");
  }
  async function saveEntry(event) {
    event.preventDefault();
    if (!entry.title?.trim() && type !== "tasks") return;
    const nextEntry = {
      ...entry,
      id: entry.id || uid(),
      title: entry.title?.trim(),
      text: entry.text?.trim(),
    };
    if (type === "journal")
      nextEntry.date = entry.date || new Date().toISOString().slice(0, 10);
    const next = entry.id
      ? content.map((item) => (item.id === entry.id ? nextEntry : item))
      : [nextEntry, ...content];
    if (
      await persist(
        next,
        type === "journal"
          ? "A thought, safely kept."
          : "Saved to your private space.",
      )
    )
      setEntry(null);
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose an image for this memory.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Please choose an image smaller than 8 MB.");
      return;
    }
    setUploadBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, kind: "photo", name: file.name }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The image could not be uploaded.");
      setEntry((current) => ({ ...current, url: result.url }));
    } catch (error) {
      toast(error.message);
    } finally {
      setUploadBusy(false);
      event.target.value = "";
    }
  }
  const completed = Array.isArray(content)
    ? content.filter((task) => task.done).length
    : 0;
  const monthDays = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const calendarStart = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  ).getDay();
  const today = new Date().toISOString().slice(0, 10);
  function dayKey(day) {
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function addEntry(date) {
    setEntry(
      type === "tasks"
        ? { text: "" }
        : type === "journal"
          ? { title: "", text: "", date: today }
          : type === "planner"
            ? { title: "", date: date || today }
            : { title: "", url: "" },
    );
  }
  return (
    <div className="tools-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE QUIETER SIDE OF YOUR WORLD</span>
          <h1>
            Room to be you<span className="heading-dot">.</span>
          </h1>
          <p>Your plans, thoughts, and favorite little moments.</p>
        </div>
        <span className="private-tools-badge">
          <LockKeyhole size={14} />
          For your eyes only
        </span>
      </div>
      <div className="private-tools-layout">
        <aside className="private-tool-nav">
          {Object.entries(toolInfo).map(([key, item]) => {
            const ToolIcon = item.icon;
            return (
              <button
                key={key}
                className={key === type ? "active" : ""}
                onClick={() => {
                  setType(key);
                  navigate("tools", key);
                }}
              >
                <span className={`tool-nav-icon ${item.color}`}>
                  <ToolIcon size={18} />
                </span>
                <span>{item.title}</span>
                {key === type && <ArrowRight size={16} />}
              </button>
            );
          })}
          <div className="private-tool-note">
            <LockKeyhole size={21} />
            <strong>A room within your room.</strong>
            <p>
              Visitors can only open a tool when you explicitly give them
              access.
            </p>
          </div>
          <button className="room-back-link" onClick={() => navigate("room")}>
            <ArrowLeft size={15} />
            Back to your room
          </button>
        </aside>
        <section className="private-tool-content card">
          <div className="private-tool-header">
            <div>
              <span className={`private-tool-header-icon ${info.color}`}>
                <Icon size={22} />
              </span>
              <div>
                <span className="eyebrow">{info.label.toUpperCase()}</span>
                <h2>{info.title}</h2>
                <p>{info.subtitle}</p>
              </div>
            </div>
            <Badge tone="sage">
              <LockKeyhole size={11} />
              Private
            </Badge>
          </div>
          {type === "tasks" && (
            <div className="tasks-tool">
              <div className="task-progress">
                <div>
                  <strong>
                    {content.length
                      ? completed === content.length
                        ? "A little lighter already."
                        : "One little thing at a time."
                      : "A fresh page for your day."}
                  </strong>
                  <span>
                    {completed} of {content.length} complete
                  </span>
                </div>
                <div className="task-progress-bar">
                  <span
                    style={{
                      width: `${content.length ? (completed / content.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <form className="task-add-form" onSubmit={addTask}>
                <Plus size={19} />
                <input
                  aria-label="New task"
                  placeholder="What would you like to make time for?"
                  maxLength={250}
                  value={taskText}
                  onChange={(event) => setTaskText(event.target.value)}
                />
                <button
                  type="submit"
                  aria-label="Add task"
                  disabled={busy || !taskText.trim()}
                >
                  <CornerDownLeft size={18} />
                </button>
              </form>
              <div className="task-filter tabs">
                {[
                  ["all", "Everything"],
                  ["active", "Still to do"],
                  ["done", "Little wins"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="task-list">
                {content
                  .filter((task) =>
                    filter === "active"
                      ? !task.done
                      : filter === "done"
                        ? task.done
                        : true,
                  )
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`task-row ${task.done ? "done" : ""}`}
                    >
                      <button
                        className="task-check"
                        aria-label={
                          task.done
                            ? `Mark ${task.text} incomplete`
                            : `Complete ${task.text}`
                        }
                        aria-pressed={task.done}
                        disabled={busy}
                        onClick={() =>
                          persist(
                            content.map((item) =>
                              item.id === task.id
                                ? { ...item, done: !item.done }
                                : item,
                            ),
                          )
                        }
                      >
                        {task.done && <Check size={14} />}
                      </button>
                      <span>{task.text}</span>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${task.text}`}
                        disabled={busy}
                        onClick={() => setEntry({ ...task })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${task.text}`}
                        disabled={busy}
                        onClick={() =>
                          persist(content.filter((item) => item.id !== task.id))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
              {!content.filter((task) =>
                filter === "active"
                  ? !task.done
                  : filter === "done"
                    ? task.done
                    : true,
              ).length && (
                <Empty
                  icon={CheckCheck}
                  title={
                    filter === "done"
                      ? "Your little wins will live here."
                      : "A little breathing room."
                  }
                >
                  Add something small. Start where you are.
                </Empty>
              )}
              {completed > 0 && (
                <button
                  className="clear-completed"
                  disabled={busy}
                  onClick={() =>
                    persist(
                      content.filter((task) => !task.done),
                      "A clean slate for what comes next.",
                    )
                  }
                >
                  <CheckCheck size={14} />
                  Clear completed tasks
                </button>
              )}
            </div>
          )}
          {type === "journal" && (
            <div className="journal-tool">
              <div className="tool-action-row">
                <span>
                  {content.length}{" "}
                  {content.length === 1 ? "thought" : "thoughts"}, safely kept
                </span>
                <Button onClick={() => addEntry()}>
                  <Plus size={15} />A new page
                </Button>
              </div>
              {content.length ? (
                <div className="journal-entries">
                  {[...content]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((item) => (
                      <article className="journal-entry" key={item.id}>
                        <div className="journal-date">
                          <span>
                            {new Date(
                              `${item.date.slice(0, 10)}T12:00:00`,
                            ).toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <strong>
                            {new Date(
                              `${item.date.slice(0, 10)}T12:00:00`,
                            ).getDate()}
                          </strong>
                        </div>
                        <button
                          className="journal-entry-text"
                          onClick={() => setEntry({ ...item })}
                        >
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                          <span>
                            Open this page
                            <ArrowRight size={13} />
                          </span>
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete journal entry ${item.title}`}
                          disabled={busy}
                          onClick={() =>
                            persist(
                              content.filter((entry) => entry.id !== item.id),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </article>
                    ))}
                </div>
              ) : (
                <Empty icon={BookOpen} title="How are you, really?">
                  No audience. No perfect words. Just a place to start.
                </Empty>
              )}
            </div>
          )}
          {type === "planner" && (
            <div className="calendar-tool">
              <div className="calendar-toolbar">
                <div>
                  <button
                    className="icon-button"
                    aria-label="Previous month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3>
                    {month.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    className="icon-button"
                    aria-label="Next month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <Button onClick={() => addEntry()}>
                  <Plus size={14} />A little plan
                </Button>
              </div>
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <span key={day} className="calendar-day-name">
                      {day}
                    </span>
                  ),
                )}
                {Array.from({ length: calendarStart }, (_, index) => (
                  <div key={`empty${index}`} className="calendar-day blank" />
                ))}
                {Array.from({ length: monthDays }, (_, index) => {
                  const day = index + 1,
                    key = dayKey(day),
                    events = content.filter((item) =>
                      item.date?.startsWith(key),
                    );
                  return (
                    <div
                      className={`calendar-day ${key === today ? "today" : ""}`}
                      key={day}
                    >
                      <button
                        className="calendar-day-number"
                        aria-label={`Add a plan on ${key}`}
                        onClick={() => addEntry(key)}
                      >
                        {day}
                      </button>
                      {events.slice(0, 2).map((item) => (
                        <button
                          className="calendar-event"
                          key={item.id}
                          onClick={() => setEntry({ ...item })}
                          title={item.title}
                        >
                          {item.title}
                        </button>
                      ))}
                      {events.length > 2 && (
                        <button
                          className="calendar-more"
                          onClick={() => setEntry({ ...events[2] })}
                        >
                          +{events.length - 2} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-upcoming">
                <h3>Around the corner</h3>
                {[...content]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .filter((item) => item.date >= today)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="calendar-plan">
                      <span className="calendar-plan-date">
                        {dateLabel(item.date)}
                      </span>
                      <button onClick={() => setEntry({ ...item })}>
                        {item.title}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete plan ${item.title}`}
                        disabled={busy}
                        onClick={() =>
                          persist(
                            content.filter((event) => event.id !== item.id),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                {!content.some((item) => item.date >= today) && (
                  <p className="muted">A little space for something good.</p>
                )}
              </div>
            </div>
          )}
          {type === "memories" && (
            <div className="memories-tool">
              <div className="tool-action-row">
                <span>{content.length} moments worth keeping</span>
                <Button onClick={() => addEntry()}>
                  <Plus size={15} />
                  Keep a moment
                </Button>
              </div>
              {content.length ? (
                <div className="memory-grid">
                  {content.map((item, index) => (
                    <article
                      className={`memory-card memory-tilt-${index % 3}`}
                      key={item.id}
                    >
                      <button
                        className="memory-open"
                        onClick={() => setEntry({ ...item })}
                      >
                        {item.url ? (
                          <img
                            src={item.url}
                            alt={item.title}
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <span className="memory-empty-art">
                            <Image size={38} />
                          </span>
                        )}
                        <h3>{item.title}</h3>
                        <span>A little moment, forever yours</span>
                      </button>
                      <button
                        className="memory-delete"
                        aria-label={`Delete memory ${item.title}`}
                        disabled={busy}
                        onClick={() =>
                          persist(
                            content.filter((memory) => memory.id !== item.id),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Image}
                  title="The little things are the big things."
                >
                  Keep a photo, a place, or a moment that makes you smile.
                </Empty>
              )}
            </div>
          )}
          {type === "whiteboard" && (
            <div className="whiteboard-tool">
              <div className="tool-action-row">
                <span>
                  <StickyNote size={14} />A messy thought is a good start.
                </span>
                <div className="row">
                  <Button
                    variant="ghost"
                    disabled={busy || !content.text}
                    onClick={() =>
                      persist({ text: "" }, "Room for a fresh idea.")
                    }
                  >
                    <Trash2 size={14} />
                    Clear
                  </Button>
                  <Button
                    disabled={busy || content.text === resource?.content?.text}
                    onClick={() =>
                      persist(content, "Your ideas are safely kept.")
                    }
                  >
                    <Save size={14} />
                    Save board
                  </Button>
                </div>
              </div>
              <div className="whiteboard-canvas">
                <div className="whiteboard-paper">
                  <span className="whiteboard-tape" />
                  <textarea
                    aria-label="Your private whiteboard"
                    value={content.text || ""}
                    placeholder={
                      "An idea, a daydream, a little spark…\n\nWhat could you make room for?"
                    }
                    maxLength={20000}
                    onChange={(event) =>
                      setContent({ text: event.target.value })
                    }
                  />
                </div>
                <span className="whiteboard-doodle doodle-a">✳︎</span>
                <span className="whiteboard-doodle doodle-b">✦</span>
                <span className="whiteboard-note">
                  Good things start on a blank page.
                </span>
              </div>
              <div className="whiteboard-footer">
                <span>
                  <LockKeyhole size={12} />
                  Your private thinking space
                </span>
                <button
                  onClick={() => {
                    const blob = new Blob([content.text || ""], {
                      type: "text/plain",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "my-roomverse-ideas.txt";
                    link.click();
                    URL.revokeObjectURL(url);
                    toast("Your ideas are ready to take with you.");
                  }}
                >
                  <Download size={14} />
                  Take your ideas with you
                </button>
              </div>
            </div>
          )}
          <div className="private-tool-footer">
            <ShieldCheck size={14} />
            Your room is yours. These tools are private, even when you have
            company.
          </div>
        </section>
      </div>
      {entry && (
        <Modal
          title={
            type === "journal"
              ? entry.id
                ? "A page from your journal"
                : "A fresh little page"
              : type === "planner"
                ? entry.id
                  ? "Your little plan"
                  : "Make a little plan"
                : type === "memories"
                  ? "A moment worth keeping"
                  : "A little to-do"
          }
          onClose={() => setEntry(null)}
          wide={type === "journal"}
        >
          <form
            onSubmit={
              type === "tasks"
                ? async (event) => {
                    event.preventDefault();
                    if (!entry.text?.trim()) return;
                    const next = content.map((task) =>
                      task.id === entry.id
                        ? { ...task, text: entry.text.trim() }
                        : task,
                    );
                    if (await persist(next)) setEntry(null);
                  }
                : saveEntry
            }
            className="tool-entry-form"
          >
            {type === "tasks" ? (
              <label className="field">
                Your to-do
                <input
                  autoFocus
                  value={entry.text || ""}
                  maxLength={250}
                  onChange={(event) =>
                    setEntry({ ...entry, text: event.target.value })
                  }
                  required
                />
              </label>
            ) : (
              <label className="field">
                {type === "journal"
                  ? "Give this page a title"
                  : type === "memories"
                    ? "What would you call this moment?"
                    : "What are you making time for?"}
                <input
                  autoFocus
                  value={entry.title || ""}
                  maxLength={type === "journal" ? 150 : 200}
                  placeholder={
                    type === "journal"
                      ? "Today felt like…"
                      : type === "memories"
                        ? "A slow Sunday morning"
                        : "Coffee with a friend"
                  }
                  onChange={(event) =>
                    setEntry({ ...entry, title: event.target.value })
                  }
                  required
                />
              </label>
            )}
            {(type === "journal" || type === "planner") && (
              <label className="field">
                Date
                <input
                  type="date"
                  value={entry.date?.slice(0, 10) || today}
                  onChange={(event) =>
                    setEntry({ ...entry, date: event.target.value })
                  }
                  required
                />
              </label>
            )}
            {type === "journal" && (
              <label className="field journal-writing-label">
                Your thoughts
                <textarea
                  value={entry.text || ""}
                  placeholder="You don't have to have it all figured out. Start with a thought."
                  rows={10}
                  maxLength={20000}
                  onChange={(event) =>
                    setEntry({ ...entry, text: event.target.value })
                  }
                />
              </label>
            )}
            {type === "memories" && (
              <>
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={upload}
                />
                <button
                  type="button"
                  className="memory-upload"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploadBusy}
                >
                  {entry.url ? (
                    <img src={entry.url} alt="Your memory preview" />
                  ) : (
                    <>
                      <Upload size={28} />
                      <strong>
                        {uploadBusy
                          ? "Keeping your moment…"
                          : "Choose a little moment"}
                      </strong>
                      <span>Upload a photo · up to 8 MB</span>
                    </>
                  )}
                </button>
                <label className="field">
                  Or use an image link
                  <input
                    type="text"
                    inputMode="url"
                    value={entry.url || ""}
                    placeholder="https://…"
                    onChange={(event) =>
                      setEntry({ ...entry, url: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            <div className="tool-entry-actions">
              {entry.id && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await persist(
                        content.filter((item) => item.id !== entry.id),
                      )
                    )
                      setEntry(null);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              )}
              <div className="row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEntry(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || uploadBusy}>
                  <Check size={15} />
                  {busy ? "Saving…" : "Keep it safe"}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
