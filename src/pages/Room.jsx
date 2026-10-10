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
import { avatarOptions, avatarStyles } from "../components/Avatar.jsx";
import RoomScene, { roomObjectDefaults } from "../components/RoomScene.jsx";
import { SharedRoom } from "./Visits.jsx";
import "./room.css";

const themes = [
  { id: "sage", name: "Sage", color: "#b5c9b9" },
  { id: "clay", name: "Terracotta", color: "#d5ac96" },
  { id: "lavender", name: "Lavender", color: "#bdb2d0" },
  { id: "midnight", name: "Midnight", color: "#5d6e7d" },
];
const toolInfo = {
  tasks: {
    label: "Tasks",
    title: "Tasks",
    icon: CheckCheck,
    subtitle: "A private task list.",
    color: "sage",
  },
  journal: {
    label: "Journal",
    title: "Journal",
    icon: BookOpen,
    subtitle: "Notes and journal entries.",
    color: "peach",
  },
  planner: {
    label: "Calendar",
    title: "Calendar",
    icon: CalendarDays,
    subtitle: "Keep track of your plans.",
    color: "lavender",
  },
  memories: {
    label: "Memories",
    title: "Memories",
    icon: Image,
    subtitle: "Save photos and memories.",
    color: "sand",
  },
  whiteboard: {
    label: "Whiteboard",
    title: "Whiteboard",
    icon: StickyNote,
    subtitle: "A private space for ideas.",
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
    if (!text.trim() || busy) return;
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
          ? "Room opened. Choose friends to invite."
          : proposal.action === "open_resource"
            ? "Private tool opened."
            : "Changes saved.",
      );
      if (result.navigate && navigate)
        navigate(result.navigate, result.resourceType);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  const suggestions =
    data.room.objects.length < 3
      ? [
          { label: "Add a plant", prompt: "Add a plant" },
          { label: "Add a sofa", prompt: "Add a sofa" },
          { label: "Add a desk", prompt: "Add a desk" },
        ]
      : [
          {
            label: "Warm lighting",
            prompt: "Add a lamp and make the room warm",
          },
          { label: "Lavender", prompt: "A lavender mood" },
          { label: "Add a task", prompt: "Add a task: Take a mindful break" },
        ];
  return (
    <section
      className={`roomie-panel ${compact ? "roomie-compact" : ""}`}
      aria-label="Roomie assistant"
    >
      <div className="roomie-heading">
        <span className="roomie-mark">
          <Sparkles size={21} />
        </span>
        <div>
          <h2>Roomie</h2>
          <p>Tell Roomie what you want to change.</p>
        </div>
      </div>
      <form className="roomie-input" onSubmit={preview}>
        <label htmlFor="roomie-prompt">What would you like in your room?</label>
        <textarea
          id="roomie-prompt"
          aria-label="Ask Roomie"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Add a cozy sofa, a plant, and warm lighting…"
          maxLength={500}
          rows={3}
        />
        <Button type="submit" disabled={busy || !prompt.trim()}>
          <Sparkles size={15} />
          {busy ? "Preparing…" : "Preview changes"}
          <ArrowRight size={15} />
        </Button>
      </form>
      {!proposal && (
        <div className="roomie-suggestions">
          {suggestions.map((item) => (
            <button
              key={item.label}
              disabled={busy}
              onClick={() => preview(null, item.prompt)}
            >
              <Plus size={12} />
              {item.label}
            </button>
          ))}
        </div>
      )}
      {proposal && (
        <div className="roomie-proposal">
          <span className="eyebrow">
            <Eye size={13} />
            PREVIEW
          </span>
          <p>{proposal.message || "Review your changes."}</p>
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
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="roomie-footnote">
        <ShieldCheck size={14} />
        <span>Review before applying. Room changes can be undone.</span>
      </div>
    </section>
  );
}

export function RoomPage(props) {
  const { data } = props;
  if (
    data.session &&
    (data.session.hostId !== data.user.id ||
      data.session.participants.length > 1)
  ) {
    return (
      <SharedRoom
        {...props}
        ownerRoomie={
          <RoomiePanel
            data={data}
            act={props.act}
            toast={props.toast}
            navigate={props.navigate}
          />
        }
      />
    );
  }
  return <OwnerRoomPage {...props} />;
}

function OwnerRoomPage({ data, act, navigate, toast }) {
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
      toast("Room saved.");
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
      toast("Previous room restored.");
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
      navigate("visits", "invite");
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  const pending = data.requests.filter(
    (request) =>
      ["knock", "invite", "access"].includes(request.type) &&
      request.status === "pending",
  ).length;
  return (
    <div className="room-page room-page-simple">
      <div className="page-heading room-page-heading">
        <div>
          <h1>My room</h1>
          <p>Arrange your space and invite your friends.</p>
        </div>
        <div className="room-top-actions">
          <Button variant="secondary" onClick={() => navigate("visits")}>
            <MessageCircle size={16} />
            Invites &amp; knocks
            {pending > 0 && (
              <span className="room-pending-count">{pending}</span>
            )}
          </Button>
          <Button onClick={host} disabled={busy}>
            <Users size={16} />
            Invite friend
          </Button>
        </div>
      </div>
      <div className="room-workspace">
        <section className={`room-stage-card ${editing ? "is-editing" : ""}`}>
          <div className="room-stage-heading">
            <div>
              <span className="room-stage-label">
                <span className="live-dot" />
                {data.user.name.split(" ")[0]}'s room
              </span>
              <span className="room-stage-theme">
                {themes.find((theme) => theme.id === sceneRoom.theme)?.name ||
                  "Sage"}
              </span>
            </div>
            <span className="room-privacy">
              <LockKeyhole size={12} />
              Private
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
                object.type === "desk" ? navigate("tools") : setInspect(object)
              }
              onUserClick={(person) => navigate("profile", person.id)}
            />
            {editing && (
              <span className="room-edit-hint">
                <Pencil size={13} />
                Drag furniture or use the arrow keys
              </span>
            )}
          </div>
          <div className="room-stage-footer">
            <button
              className="room-avatar-link"
              onClick={() => navigate("avatar")}
            >
              <Avatar user={data.user} size={34} />
              <span>Edit avatar</span>
              <Pencil size={13} />
            </button>
            <div className="row">
              <button
                className="room-scene-shortcut"
                onClick={() => (editing ? setEditing(false) : beginEdit())}
              >
                <SlidersHorizontal size={15} />
                {editing ? "Close editor" : "Manual controls"}
              </button>
              {room.history && (
                <button
                  className="room-scene-shortcut"
                  onClick={undo}
                  disabled={busy}
                >
                  <Undo2 size={15} />
                  Undo
                </button>
              )}
            </div>
          </div>
        </section>
        <RoomiePanel data={data} act={act} toast={toast} navigate={navigate} />
      </div>
      {editing && (
        <section className="room-editor card">
          <div className="section-title">
            <div>
              <span className="eyebrow">APPEARANCE</span>
              <h3>Room controls</h3>
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
                    moveObject(selected, selectedObject.x - 1, selectedObject.y)
                  }
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Move up"
                  onClick={() =>
                    moveObject(selected, selectedObject.x, selectedObject.y - 1)
                  }
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Move down"
                  onClick={() =>
                    moveObject(selected, selectedObject.x, selectedObject.y + 1)
                  }
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Move right"
                  onClick={() =>
                    moveObject(selected, selectedObject.x + 1, selectedObject.y)
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
            <span>Save changes to update your room.</span>
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
            <span className="eyebrow">PRIVATE TOOLS</span>
            <h2>Private tools</h2>
          </div>
          <span>
            <LockKeyhole size={12} />
            Only shared with your approval
          </span>
        </div>
        <div className="room-tool-shortcuts">
          {Object.entries(toolInfo).map(([type, info]) => {
            const Icon = info.icon;
            const resource = data.resources.find((item) => item.type === type);
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
                      : "Open board"}
                </span>
                <ArrowRight className="room-tool-arrow" size={15} />
              </button>
            );
          })}
        </div>
      </section>

      {showFurniture && (
        <Modal title="Add furniture" onClose={() => setShowFurniture(false)}>
          <p className="muted">Select an item, then move it into place.</p>
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
          <p className="muted">Move, recolor, or remove this item.</p>
          <Button
            onClick={() => {
              beginEdit(inspect.id);
              setInspect(null);
            }}
          >
            <Pencil size={16} />
            Edit furniture
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
      toast("Avatar saved.");
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
      accessory: pick([
        "none",
        "glasses",
        "earrings",
        "headphones",
        "cap",
        "beanie",
      ]),
      eyes: pick(Object.values(avatarOptions.eyes)),
      outfitStyle: pick(avatarStyles.outfitStyle.map((item) => item.id)),
      expression: pick(avatarStyles.expression.map((item) => item.id)),
    });
  }
  return (
    <div className="avatar-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AVATAR STUDIO</span>
          <h1>
            Avatar studio<span className="heading-dot">.</span>
          </h1>
          <p>Customize your avatar.</p>
        </div>
        <Button onClick={save} disabled={busy || !changed}>
          <Check size={16} />
          {busy ? "Saving…" : "Save your look"}
        </Button>
      </div>
      <div className="avatar-designer-grid">
        <section className="avatar-large-preview">
          <span className="avatar-preview-label">
            PREVIEW — {data.user.name.split(" ")[0].toUpperCase()}
          </span>
          <div className="avatar-preview-halo">
            <span className="avatar-preview-spark spark-a">✦</span>
            <span className="avatar-preview-spark spark-b">✳︎</span>
            <Avatar config={config} size={300} />
          </div>
          <h2>Your avatar</h2>
          <p>Changes appear here before you save.</p>
          <Button variant="secondary" onClick={randomize}>
            <WandSparkles size={16} />
            Surprise me
          </Button>
          <div className="avatar-preview-small">
            <Avatar config={config} size={40} />
            <Avatar config={config} size={56} />
            <Avatar config={config} size={76} />
            <span>Profile sizes</span>
          </div>
        </section>
        <section className="avatar-customizer card">
          <div className="tabs">
            <button
              className={tab === "look" ? "active" : ""}
              onClick={() => setTab("look")}
            >
              Appearance
            </button>
            <button
              className={tab === "style" ? "active" : ""}
              onClick={() => setTab("style")}
            >
              Clothing & accessories
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
              <ColorChoices
                label="Eye color"
                value={config.eyes}
                options={avatarOptions.eyes}
                onChange={(value) => choose("eyes", value)}
              />
              <AvatarStyleChoices
                label="Expression"
                field="expression"
                config={config}
                choose={choose}
              />
              <div className="avatar-choice-section">
                <h3>Hair style</h3>
                <p>Choose a hair style.</p>
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
                          ? "Waves"
                          : style === "bob"
                            ? "Bob"
                            : style === "curls"
                              ? "Curls"
                              : style === "crop"
                                ? "Crop"
                                : "Braids"}
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
              <AvatarStyleChoices
                label="Outfit style"
                field="outfitStyle"
                config={config}
                choose={choose}
              />
              <ColorChoices
                label="Outfit color"
                value={config.outfit}
                options={avatarOptions.outfit}
                onChange={(value) => choose("outfit", value)}
              />
              <div className="avatar-choice-section">
                <h3>Accessories</h3>
                <p>Choose an accessory.</p>
                <div className="avatar-accessories">
                  {[
                    { id: "none", label: "None" },
                    { id: "glasses", label: "Glasses" },
                    { id: "earrings", label: "Earrings" },
                    { id: "headphones", label: "Headphones" },
                    { id: "cap", label: "Cap" },
                    { id: "beanie", label: "Beanie" },
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
              Saved across rooms and your profile.
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

function AvatarStyleChoices({ label, field, config, choose }) {
  return (
    <div className="avatar-choice-section">
      <h3>{label}</h3>
      <div className="avatar-accessories">
        {avatarStyles[field].map((item) => (
          <button
            key={item.id}
            className={config[field] === item.id ? "active" : ""}
            aria-pressed={config[field] === item.id}
            onClick={() => choose(field, item.id)}
          >
            <Avatar config={{ ...config, [field]: item.id }} size={64} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
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
        type === "journal" ? "Journal entry saved." : "Saved.",
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
          <span className="eyebrow">PRIVATE TOOLS</span>
          <h1>
            Private tools<span className="heading-dot">.</span>
          </h1>
          <p>Tasks, notes, plans, and memories.</p>
        </div>
        <span className="private-tools-badge">
          <LockKeyhole size={14} />
          Private by default
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
            <strong>Control who can open your tools.</strong>
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
                        ? "All tasks completed."
                        : "Your tasks"
                      : "No tasks yet"}
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
                  placeholder="Add a task…"
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
                  ["all", "All tasks"],
                  ["active", "To do"],
                  ["done", "Completed"],
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
                  title={filter === "done" ? "No completed tasks" : "No tasks"}
                >
                  Add a task using the field above.
                </Empty>
              )}
              {completed > 0 && (
                <button
                  className="clear-completed"
                  disabled={busy}
                  onClick={() =>
                    persist(
                      content.filter((task) => !task.done),
                      "Completed tasks cleared.",
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
                  <Plus size={15} />
                  New entry
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
                <Empty icon={BookOpen} title="No journal entries">
                  Create your first entry.
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
                  <Plus size={14} />
                  Add plan
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
                <h3>Upcoming plans</h3>
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
                  <p className="muted">No upcoming plans.</p>
                )}
              </div>
            </div>
          )}
          {type === "memories" && (
            <div className="memories-tool">
              <div className="tool-action-row">
                <span>{content.length} memories</span>
                <Button onClick={() => addEntry()}>
                  <Plus size={15} />
                  Add memory
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
                        <span>Private memory</span>
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
                <Empty icon={Image} title="No memories">
                  Upload a photo to create a memory.
                </Empty>
              )}
            </div>
          )}
          {type === "whiteboard" && (
            <div className="whiteboard-tool">
              <div className="tool-action-row">
                <span>
                  <StickyNote size={14} />
                  Write and save your ideas.
                </span>
                <div className="row">
                  <Button
                    variant="ghost"
                    disabled={busy || !content.text}
                    onClick={() => persist({ text: "" }, "Board cleared.")}
                  >
                    <Trash2 size={14} />
                    Clear
                  </Button>
                  <Button
                    disabled={busy || content.text === resource?.content?.text}
                    onClick={() => persist(content, "Board saved.")}
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
                    placeholder={"Write your notes or ideas…"}
                    maxLength={20000}
                    onChange={(event) =>
                      setContent({ text: event.target.value })
                    }
                  />
                </div>
                <span className="whiteboard-doodle doodle-a">✳︎</span>
                <span className="whiteboard-doodle doodle-b">✦</span>
                <span className="whiteboard-note">
                  Save your changes when you finish.
                </span>
              </div>
              <div className="whiteboard-footer">
                <span>
                  <LockKeyhole size={12} />
                  Private board
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
                    toast("Notes exported.");
                  }}
                >
                  <Download size={14} />
                  Export notes
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
                ? "Edit journal entry"
                : "New journal entry"
              : type === "planner"
                ? entry.id
                  ? "Edit plan"
                  : "Add plan"
                : type === "memories"
                  ? "Memory"
                  : "Edit task"
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
                Task
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
                  ? "Title"
                  : type === "memories"
                    ? "Memory title"
                    : "Plan title"}
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
                Entry
                <textarea
                  value={entry.text || ""}
                  placeholder="Write your entry…"
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
                        {uploadBusy ? "Uploading…" : "Choose a photo"}
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
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
