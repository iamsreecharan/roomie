import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowDown,
  Bookmark,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  DoorOpen,
  Download,
  ExternalLink,
  Eye,
  Flag,
  Frame,
  Globe2,
  ImagePlus,
  Layers3,
  Maximize2,
  Mic2,
  Palette,
  Plus,
  Radio,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { Art, Avatar, Badge, Button, Empty, Modal, timeAgo } from "../lib.jsx";
import { MediaCall } from "../components/MediaCall.jsx";
import "./creators.css";

const patterns = ["sunset", "bloom", "tide", "orbit"];
const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date to be announced"
    : date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};
const ownerOf = (data, hall) =>
  data.users?.find((user) => user.id === hall?.ownerId) ||
  (data.user?.id === hall?.ownerId ? data.user : null);
const count = (value) => Number(value || 0).toLocaleString();
const verified = (user) => user?.verified || user?.verification === "VERIFIED";
const artworkImage = (artwork) =>
  artwork.url ? (
    <img
      src={artwork.url}
      alt={artwork.alt || artwork.title || "Artwork"}
      loading="lazy"
    />
  ) : (
    <Art variant={artwork.variant || "sunset"} />
  );
function CreatorName({ creator, navigate, small = false, showAvatar = true }) {
  return (
    <button
      className={`cv-creator-name ${small ? "small" : ""}`}
      onClick={() => creator && navigate("profile", creator.id)}
    >
      {showAvatar && <Avatar user={creator} size={small ? 28 : 36} />}
      <span>{creator?.name || "Independent creator"}</span>
      {verified(creator) && (
        <ShieldCheck size={14} aria-label="Verified creator" />
      )}
    </button>
  );
}
function HallCard({ hall, data, navigate }) {
  const creator = ownerOf(data, hall);
  return (
    <article className="cv-hall-card">
      <button
        className={`cv-cover cv-cover-${hall.cover || "sunset"}`}
        onClick={() => navigate("hall", hall.id)}
        aria-label={`Explore ${hall.title}`}
      >
        <Art variant={hall.cover || "sunset"} />
        <span className="cv-cover-label">
          {hall.live ? (
            <>
              <span className="cv-live-dot" /> LIVE WITH THE CREATOR
            </>
          ) : (
            <>
              <DoorOpen size={12} /> ALWAYS OPEN
            </>
          )}
        </span>
        <span className="cv-cover-enter">
          <ArrowUpRight size={20} />
        </span>
      </button>
      <div className="cv-hall-card-content">
        <div className="cv-hall-title">
          <button onClick={() => navigate("hall", hall.id)}>
            {hall.title}
          </button>
          <span>
            <Frame size={13} /> {hall.artworks?.length || 0}
          </span>
        </div>
        <p>{hall.description}</p>
        <div className="cv-hall-card-bottom">
          <CreatorName creator={creator} navigate={navigate} small />
          <span title="People in this hall right now">
            <Users size={13} /> {count(hall.attendance)} here
          </span>
        </div>
      </div>
    </article>
  );
}

export function HallsPage({ data, navigate, toast }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const published = (data.halls || []).filter((hall) => hall.published);
  const halls = published.filter((hall) => {
    const owner = ownerOf(data, hall);
    return (
      (filter !== "live" || hall.live) &&
      (filter !== "following" || owner?.following) &&
      `${hall.title} ${hall.description} ${owner?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const featured = published.find((hall) => hall.live) || published[0];
  return (
    <div className="cv-page cv-discover">
      <div className="page-heading cv-heading">
        <div>
          <div className="eyebrow">THE CREATOR DISTRICT</div>
          <h1>Art has a place here.</h1>
          <p>
            Wander through independent worlds. Find something that stays with
            you.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("creator")}>
          <Palette size={16} /> Your creator studio
        </Button>
      </div>
      {featured && (
        <section className="cv-featured">
          <div className="cv-featured-copy">
            <span className="cv-overline">
              <span className="cv-feature-star">✳</span> A WORLD WORTH WANDERING
            </span>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <CreatorName
              creator={ownerOf(data, featured)}
              navigate={navigate}
            />
            <Button onClick={() => navigate("hall", featured.id)}>
              Step inside <ArrowRight size={17} />
            </Button>
            <div className="cv-featured-meta">
              <span>
                <Frame size={14} /> {featured.artworks?.length || 0} works to
                discover
              </span>
              <span>
                <Globe2 size={14} />{" "}
                {featured.access === "followers"
                  ? "For followers"
                  : featured.access === "ticket"
                    ? "Creator-issued admission"
                    : "Open to everyone"}
              </span>
            </div>
          </div>
          <button
            className="cv-featured-art"
            onClick={() => navigate("hall", featured.id)}
            aria-label={`Enter ${featured.title}`}
          >
            <div className="cv-featured-art-inner">
              <Art variant={featured.cover || "sunset"} />
            </div>
            <span className="cv-featured-plaque">
              <span>THE FEATURED HALL</span>
              <strong>{featured.title}</strong>
              <ArrowUpRight size={19} />
            </span>
            <span className="cv-frame-caption">
              a small escape, an open door.
            </span>
          </button>
        </section>
      )}
      <section className="cv-hall-discovery">
        <div className="cv-discovery-header">
          <div>
            <div className="eyebrow">FIND YOUR NEXT FAVOURITE</div>
            <h2>
              Explore the halls <span>{published.length}</span>
            </h2>
          </div>
          <label className="cv-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search halls or creators"
              aria-label="Search halls or creators"
            />
          </label>
        </div>
        <div className="cv-discovery-filters">
          <div className="tabs">
            {[
              ["all", "All worlds"],
              ["live", "Live right now"],
              ["following", "Following"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {key === "live" && <Radio size={14} />}
                {label}
              </button>
            ))}
          </div>
          <span className="cv-small-note">
            <Eye size={13} /> Quiet wandering is welcome
          </span>
        </div>
        {halls.length ? (
          <div className="cv-hall-grid">
            {halls.map((hall) => (
              <HallCard
                key={hall.id}
                hall={hall}
                data={data}
                navigate={navigate}
              />
            ))}
          </div>
        ) : (
          <Empty icon={Frame} title="No halls here yet">
            {search
              ? "Try another name or clear your search."
              : filter === "live"
                ? "Creators are away right now. Their published halls are still open."
                : "Follow a creator to find their worlds here."}
          </Empty>
        )}
      </section>
      <div className="cv-discover-note">
        <Sparkles size={19} />
        <div>
          <strong>There is no right way to explore.</strong>
          <p>
            Save a piece, join a creator’s live tour, or take your time on your
            own.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArtworkDetail({ artwork, hall, act, toast, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [guideLanguage, setGuideLanguage] = useState("en");
  const languageNames = {
    en: "Original",
    es: "Spanish",
    fr: "French",
    hi: "Hindi",
    de: "German",
    ja: "Japanese",
  };
  const guideText =
    guideLanguage === "en"
      ? artwork.description
      : artwork.translations?.[guideLanguage];
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  function speak() {
    if (!window.speechSynthesis)
      return toast(
        "Your browser does not support audio guides. The full guide is written here.",
      );
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!artwork.audioApproved)
      return toast(
        "The creator has not approved an audio guide for this work.",
      );
    const message = new SpeechSynthesisUtterance(
      `${artwork.title}. ${artwork.medium || ""}. ${artwork.year || ""}. ${guideText || ""}`,
    );
    message.lang =
      {
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        hi: "hi-IN",
        de: "de-DE",
        ja: "ja-JP",
      }[guideLanguage] || guideLanguage;
    message.onend = () => setSpeaking(false);
    message.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(message);
    setSpeaking(true);
  }
  const purchaseUrl =
    /^https?:\/\//i.test(artwork.purchaseUrl || "") &&
    artwork.saleStatus !== "sold"
      ? artwork.purchaseUrl
      : null;
  return (
    <Modal title={artwork.title} onClose={onClose} wide>
      <div className={`cv-work-detail ${zoomed ? "is-zoomed" : ""}`}>
        <div className="cv-work-detail-image">
          {artworkImage(artwork)}
          <button
            className="cv-image-zoom"
            onClick={() => setZoomed(!zoomed)}
            aria-label={zoomed ? "Reduce artwork" : "Enlarge artwork"}
          >
            {zoomed ? <X size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
        <div className="cv-work-detail-copy">
          <div className="eyebrow">FROM {hall.title}</div>
          <h2>{artwork.title}</h2>
          <div className="cv-work-facts">
            {artwork.medium && <span>{artwork.medium}</span>}
            {artwork.year && <span>{artwork.year}</span>}
          </div>
          {Object.values(artwork.translations || {}).some(Boolean) && (
            <label className="field cv-guide-language">
              Creator’s written guide
              <select
                value={guideLanguage}
                onChange={(event) => {
                  setGuideLanguage(event.target.value);
                  window.speechSynthesis?.cancel();
                  setSpeaking(false);
                }}
              >
                <option value="en">Original description</option>
                {Object.entries(artwork.translations)
                  .filter(([, text]) => text?.trim())
                  .map(([code]) => (
                    <option key={code} value={code}>
                      {languageNames[code] || code}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <p>{guideText || "The creator has not added a description yet."}</p>
          {artwork.saleStatus === "sold" && <Badge>Sold</Badge>}
          <div className="cv-work-actions">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await act("artwork.save", {
                    hallId: hall.id,
                    artworkId: artwork.id,
                  });
                } catch (error) {
                  toast(error.message);
                }
              }}
            >
              <Bookmark
                size={16}
                fill={artwork.saved ? "currentColor" : "none"}
              />{" "}
              {artwork.saved ? "Saved to your collection" : "Save this work"}
            </Button>
            {artwork.audioApproved && (
              <Button variant="ghost" onClick={speak}>
                {speaking ? <Square size={15} /> : <Volume2 size={17} />}
                {speaking ? "Stop guide" : "Listen to creator’s guide"}
              </Button>
            )}
          </div>
          {purchaseUrl && (
            <div className="cv-purchase">
              <span>
                Available from the creator
                {artwork.price ? ` · ${artwork.price}` : ""}
              </span>
              <a
                className="button secondary"
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit creator’s shop <ExternalLink size={15} />
              </a>
              <small>
                Opens the creator’s external shop. Purchases are handled there.
              </small>
            </div>
          )}
          <div className="cv-detail-foot">
            <Bookmark size={13} /> {count(artwork.saves)} saves
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function HallPage({ data, act, navigate, toast, selectedId, socket }) {
  const hall = data.halls?.find((item) => item.id === selectedId);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [tourFocus, setTourFocus] = useState(false);
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState(false);
  const [reportReason, setReportReason] = useState(
    "Misleading or inappropriate content",
  );
  const actions = useRef({ act, toast });
  actions.current = { act, toast };
  const isOwner = hall?.ownerId === data.user?.id;
  const creator = ownerOf(data, hall);
  const selectedWork = hall?.artworks?.find(
    (item) => item.id === selectedWorkId,
  );
  const visibleQuestions = (data.hallQuestions || hall?.questions || [])
    .filter(
      (item) => item.hallId === hall?.id || (!item.hallId && hall?.questions),
    )
    .filter((item) => item.approved || item.userId === data.user?.id);
  useEffect(() => {
    if (!hall?.id) return;
    const id = hall.id;
    let entered = false;
    actions.current
      .act("hall.enter", { hallId: id })
      .then(() => {
        entered = true;
        socket?.emit("hall:join", { hallId: id });
      })
      .catch((error) => actions.current.toast(error.message));
    const beat = window.setInterval(
      () => socket?.emit("hall:heartbeat", { hallId: id }),
      20000,
    );
    return () => {
      window.clearInterval(beat);
      socket?.emit("hall:leave", { hallId: id });
      if (entered)
        fetch("/api/action", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "hall.leave", hallId: id }),
          keepalive: true,
        }).catch(() => {});
    };
  }, [hall?.id, socket]);
  useEffect(() => {
    if (tourFocus && hall?.live && hall.spotlightId)
      document
        .getElementById(`cv-work-${hall.spotlightId}`)
        ?.scrollIntoView({
          behavior: data.user?.settings?.reducedMotion ? "auto" : "smooth",
          block: "center",
        });
  }, [
    hall?.spotlightId,
    tourFocus,
    hall?.live,
    data.user?.settings?.reducedMotion,
  ]);
  async function perform(type, payload) {
    try {
      return await act(type, payload);
    } catch (error) {
      toast(error.message);
      return null;
    }
  }
  if (!hall)
    return (
      <div className="cv-page">
        <Button variant="ghost" onClick={() => navigate("halls")}>
          <ArrowLeft size={16} /> Back to the halls
        </Button>
        <Empty icon={Frame} title="This hall is unavailable">
          It may be a private draft or no longer published.
        </Empty>
      </div>
    );
  return (
    <div className="cv-page cv-hall-page">
      <div className="cv-hall-back">
        <button onClick={() => navigate("halls")}>
          <ArrowLeft size={15} /> The creator district
        </button>
        <div className="row">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}/?hall=${encodeURIComponent(hall.id)}`,
                );
                toast("Hall link copied.");
              } catch {
                toast("Sharing is unavailable in this browser.");
              }
            }}
          >
            <Share2 size={14} /> Share hall
          </button>
          <button onClick={() => setReport(true)}>
            <Flag size={14} /> Report hall
          </button>
        </div>
      </div>
      <section className={`cv-hall-intro cv-theme-${hall.theme || "sage"}`}>
        <div className="cv-hall-intro-title">
          <div className="eyebrow">
            {hall.live ? (
              <>
                <span className="cv-live-dot" /> THE CREATOR IS HERE
              </>
            ) : (
              "A WORLD TO WANDER"
            )}
          </div>
          <h1>{hall.title}</h1>
          <p>{hall.description}</p>
          <CreatorName
            creator={creator}
            navigate={navigate}
            showAvatar={hall.live}
          />
        </div>
        <div className="cv-hall-intro-art">
          <Art variant={hall.cover || "sunset"} />
        </div>
        <div className="cv-hall-sign">
          <span>
            <Users size={16} />
            <strong>{count(hall.attendance)}</strong> here now
          </span>
          <span>
            <Eye size={15} />
            <strong>{count(hall.visitors)}</strong> visits
          </span>
          <span>
            <Frame size={15} />
            {hall.artworks?.length || 0} works
          </span>
        </div>
      </section>
      <>
        {hall.live && (
          <section className="cv-live-panel">
            <div className="cv-live-panel-top">
              <div>
                <span className="cv-live-dot" />
                <strong>
                  A live moment with{" "}
                  {creator?.name?.split(" ")[0] || "the creator"}
                </strong>
                <span>
                  {count(hall.attendance)} watching · audience shown as a count
                </span>
              </div>
              <Button
                variant={tourFocus ? "primary" : "secondary"}
                onClick={() => setTourFocus(!tourFocus)}
              >
                <Eye size={15} />
                {tourFocus
                  ? "Following spotlight"
                  : "Follow creator’s spotlight"}
              </Button>
            </div>
            {creator && (
              <div className="cv-live-creator">
                <Avatar user={creator} size={42} />
                <span>
                  {creator.name}
                  <small>Creator · live now</small>
                </span>
              </div>
            )}
            <MediaCall
              data={data}
              act={act}
              socket={socket}
              toast={toast}
              hall={hall}
            />
            <p className="cv-tour-note">
              Your viewing is private. Following the spotlight moves to the work
              the creator chooses; you can turn it off anytime.
            </p>
          </section>
        )}
        <section
          className={`cv-gallery cv-layout-${hall.layout || "editorial"} cv-frame-${hall.frame || "ivory"} cv-lighting-${hall.lighting || "soft"}`}
        >
          <div className="cv-gallery-heading">
            <div>
              <div className="eyebrow">THE COLLECTION</div>
              <h2>Stay a little. Look closer.</h2>
            </div>
            <span>
              {hall.artworks?.length || 0} artworks{" "}
              <span className="cv-gallery-divider">/</span> 2D gallery
            </span>
          </div>
          <div className="cv-gallery-wall">
            {hall.artworks?.map((artwork, index) => (
              <article
                key={artwork.id}
                id={`cv-work-${artwork.id}`}
                className={`cv-gallery-work ${index % 3 === 1 ? "cv-gallery-work-tall" : ""} ${tourFocus && hall.live && hall.spotlightId === artwork.id ? "is-spotlight" : ""}`}
              >
                <button
                  className="cv-gallery-image"
                  onClick={() => setSelectedWorkId(artwork.id)}
                  aria-label={`Inspect ${artwork.title}`}
                >
                  {artworkImage(artwork)}
                  <span>
                    <Maximize2 size={14} /> Look closer
                  </span>
                  {hall.live && hall.spotlightId === artwork.id && (
                    <b className="cv-spotlight-label">
                      <Radio size={12} /> CREATOR SPOTLIGHT
                    </b>
                  )}
                </button>
                <div className="cv-art-plaque">
                  <div>
                    <h3>{artwork.title}</h3>
                    <p>
                      {artwork.medium || "Digital artwork"}
                      {artwork.year ? `, ${artwork.year}` : ""}
                    </p>
                  </div>
                  <button
                    className={`icon-button ${artwork.saved ? "is-saved" : ""}`}
                    onClick={() =>
                      perform("artwork.save", {
                        hallId: hall.id,
                        artworkId: artwork.id,
                      })
                    }
                    aria-label={
                      artwork.saved
                        ? `Unsave ${artwork.title}`
                        : `Save ${artwork.title}`
                    }
                  >
                    <Bookmark
                      size={17}
                      fill={artwork.saved ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                {isOwner && hall.live && (
                  <button
                    className="cv-spotlight-action"
                    onClick={() =>
                      perform("hall.spotlight", {
                        hallId: hall.id,
                        artworkId: artwork.id,
                      })
                    }
                  >
                    <Radio size={13} /> Spotlight this artwork
                  </button>
                )}
              </article>
            ))}
          </div>
          {!hall.artworks?.length && (
            <Empty icon={Frame} title="A collection is taking shape">
              The creator will add work to these walls soon.
            </Empty>
          )}
        </section>
        <div className="cv-hall-extras">
          <section className="cv-events">
            <div className="eyebrow">MAKE IT A MOMENT</div>
            <h2>Something to look forward to.</h2>
            {hall.events?.length ? (
              hall.events.map((event) => (
                <article className="cv-event" key={event.id}>
                  <div className="cv-event-date">
                    <strong>
                      {new Date(event.date).toLocaleDateString([], {
                        day: "2-digit",
                      })}
                    </strong>
                    <span>
                      {new Date(event.date).toLocaleDateString([], {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <h3>{event.title}</h3>
                    <p>
                      <Clock3 size={12} /> {dateLabel(event.date)}
                    </p>
                    <span>{count(event.rsvps)} RSVPs</span>
                  </div>
                  <Button
                    variant={event.rsvp ? "secondary" : "primary"}
                    onClick={() =>
                      perform("event.rsvp", {
                        hallId: hall.id,
                        eventId: event.id,
                      })
                    }
                  >
                    {event.rsvp ? <Check size={14} /> : <Plus size={14} />}
                    {event.rsvp ? "Going" : "RSVP"}
                  </Button>
                </article>
              ))
            ) : (
              <p className="muted">
                No upcoming events yet. The gallery is open for your own visit.
              </p>
            )}
          </section>
          <section className="cv-qa">
            <div className="eyebrow">A THOUGHTFUL CONVERSATION</div>
            <h2>Ask the creator.</h2>
            <p>
              {hall.live && hall.questionsEnabled !== false
                ? "Questions go to the creator first. Only approved questions appear here."
                : hall.live
                  ? "The creator has paused new questions for this moment."
                  : "Questions open during live creator tours. Check the events calendar for the next conversation."}
            </p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!question.trim()) return;
                const result = await perform("hall.question", {
                  hallId: hall.id,
                  text: question.trim(),
                });
                if (result) {
                  setQuestion("");
                  toast("Question sent for creator review.");
                }
              }}
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What are you curious about?"
                maxLength={500}
                aria-label="Question for the creator"
                disabled={!hall.live || hall.questionsEnabled === false}
                required
              />
              <Button
                type="submit"
                disabled={
                  !hall.live ||
                  hall.questionsEnabled === false ||
                  !question.trim()
                }
              >
                <Send size={14} /> Send question
              </Button>
            </form>
            <div className="cv-question-list">
              {visibleQuestions.slice(-6).map((item) => (
                <div className="cv-question" key={item.id}>
                  <CircleHelp size={15} />
                  <div>
                    <p>{item.text}</p>
                    <small>
                      {item.approved
                        ? "Approved by the creator"
                        : item.rejected
                          ? "Your question · not selected by the creator"
                          : "Your question · awaiting review"}
                    </small>
                    {item.answer && (
                      <p className="cv-question-answer">{item.answer}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
      {selectedWork && (
        <ArtworkDetail
          artwork={selectedWork}
          hall={hall}
          act={act}
          toast={toast}
          onClose={() => setSelectedWorkId(null)}
        />
      )}
      {report && (
        <Modal title="Report this hall" onClose={() => setReport(false)}>
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await perform("report.create", {
                targetType: "hall",
                targetId: hall.id,
                reason: reportReason,
              });
              if (result) {
                toast("Report sent to the moderation team.");
                setReport(false);
              }
            }}
          >
            <p className="muted">
              Reports are private and reviewed by the moderation team.
            </p>
            <label className="field">
              Reason
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              >
                <option>Misleading or inappropriate content</option>
                <option>Copyright or ownership concern</option>
                <option>Harassment or hateful content</option>
                <option>Unsafe external purchase link</option>
              </select>
            </label>
            <Button type="submit">
              <Flag size={15} /> Submit report
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

const newDraft = () => ({
  title: "",
  description: "",
  cover: "sunset",
  theme: "sage",
  access: "public",
  ticketUserIds: [],
  layout: "editorial",
  frame: "ivory",
  lighting: "soft",
  artworks: [],
});
const draftFrom = (hall) => ({
  ...hall,
  artworks: (hall.artworks || []).map((artwork) => ({ ...artwork })),
});
export function CreatorPage({ data, act, navigate, toast, socket }) {
  const mine = (data.halls || []).filter(
    (hall) => hall.ownerId === data.user?.id,
  );
  const [tab, setTab] = useState("studio");
  const [hallId, setHallId] = useState(mine[0]?.id || "new");
  const hall = mine.find((item) => item.id === hallId);
  const [draft, setDraft] = useState(() =>
    hall ? draftFrom(hall) : newDraft(),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rights, setRights] = useState(false);
  const [preview, setPreview] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [application, setApplication] = useState({
    name: data.user?.name || "",
    website: "",
    statement: "",
  });
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [designPrompt, setDesignPrompt] = useState("");
  const [designProposal, setDesignProposal] = useState(null);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const isVerified = verified(data.user);
  const pendingQuestions = (data.hallQuestions || []).filter(
    (question) =>
      mine.some((item) => item.id === question.hallId) &&
      !question.approved &&
      !question.rejected,
  );
  useEffect(() => {
    if (!dirty && hall) setDraft(draftFrom(hall));
  }, [hall?.id, hall?.published, hall?.live]);
  function choose(id) {
    if (
      dirty &&
      !window.confirm(
        "You have unsaved studio changes. Discard them and switch halls?",
      )
    )
      return;
    const selected = mine.find((item) => item.id === id);
    setHallId(id);
    setDraft(selected ? draftFrom(selected) : newDraft());
    setDirty(false);
    setRights(false);
  }
  function change(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  function workChange(id, key, value) {
    setDraft((current) => ({
      ...current,
      artworks: current.artworks.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
    setDirty(true);
  }
  async function perform(type, payload) {
    try {
      return await act(type, payload);
    } catch (error) {
      toast(error.message);
      return null;
    }
  }
  function suggestDesign() {
    const prompt = designPrompt.toLowerCase();
    const proposal = /sea|ocean|night|dark|moody/.test(prompt)
      ? {
          theme: "midnight",
          cover: "tide",
          layout: "balanced",
          frame: "black",
          lighting: "soft",
          message:
            "A quiet dark wall, black frames, and an even rhythm let each work breathe.",
        }
      : /warm|sun|earth|cozy|terracotta/.test(prompt)
        ? {
            theme: "clay",
            cover: "sunset",
            layout: "editorial",
            frame: "oak",
            lighting: "warm",
            message:
              "Warm clay walls, oak frames, and a gently staggered arrangement make an intimate collection.",
          }
        : /play|color|bold|cosmic/.test(prompt)
          ? {
              theme: "lavender",
              cover: "orbit",
              layout: "salon",
              frame: "ivory",
              lighting: "bright",
              message:
                "A light lavender wall and a closer arrangement create a playful salon of your existing work.",
            }
          : {
              theme: "sage",
              cover: "bloom",
              layout: "balanced",
              frame: "ivory",
              lighting: "soft",
              message:
                "Soft sage, ivory frames, and a balanced gallery give your works an open, restful setting.",
            };
    setDesignProposal(proposal);
  }
  function moveWork(id, direction) {
    const works = [...draft.artworks];
    const index = works.findIndex((work) => work.id === id);
    const next = index + direction;
    if (next < 0 || next >= works.length) return;
    [works[index], works[next]] = [works[next], works[index]];
    change("artworks", works);
  }
  async function save() {
    if (!draft.title.trim())
      return toast("Give your hall a title before saving.");
    if (draft.artworks.some((work) => !work.title?.trim()))
      return toast("Add a title to every artwork.");
    if (draft.artworks.length && !rights)
      return toast("Confirm that you have permission to publish these works.");
    if (
      draft.artworks.some(
        (work) => work.purchaseUrl && !/^https:\/\//i.test(work.purchaseUrl),
      )
    )
      return toast("External shop links must use HTTPS.");
    setBusy(true);
    const result = await perform("hall.save", {
      hall: {
        ...draft,
        id: hall?.id,
        rightsConfirmed: rights,
        artworks: draft.artworks.map((work) => ({
          ...work,
          rightsConfirmed: rights || work.rightsConfirmed,
        })),
      },
    });
    setBusy(false);
    if (result) {
      const saved = result.hall || result;
      if (saved.id) {
        setHallId(saved.id);
        setDraft((current) => ({ ...current, id: saved.id }));
      }
      setDirty(false);
      toast("Hall draft saved.");
    }
  }
  async function upload(event, id) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!rights) {
      event.target.value = "";
      return toast("Confirm artwork ownership before uploading.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.target.value = "";
      return toast("Choose a JPEG, PNG, or WebP image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      return toast("Choose an artwork image smaller than 5 MB.");
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, kind: "artwork", name: file.name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      workChange(id, "url", result.url);
      toast("Artwork uploaded. Save the draft to add it to your hall.");
    } catch (error) {
      toast(error.message || "Could not upload this image.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  const metrics = {
    visits: mine.reduce((sum, item) => sum + Number(item.visitors || 0), 0),
    artworks: mine.reduce((sum, item) => sum + (item.artworks?.length || 0), 0),
    saves: mine.reduce(
      (sum, item) =>
        sum +
        (item.artworks || []).reduce(
          (total, work) => total + Number(work.saves || 0),
          0,
        ),
      0,
    ),
    attendance: mine.reduce(
      (sum, item) => sum + Number(item.attendance || 0),
      0,
    ),
  };
  return (
    <div className="cv-page cv-studio">
      <div className="page-heading cv-heading">
        <div>
          <div className="eyebrow">YOUR CREATOR STUDIO</div>
          <h1>Make a world of your work.</h1>
          <p>Your walls. Your story. A place for people to discover it.</p>
        </div>
        <Badge tone={isVerified ? "green" : "amber"}>
          <ShieldCheck size={14} />
          {isVerified
            ? "Verified creator"
            : data.user?.verification === "PENDING_REVIEW"
              ? "Verification under review"
              : "Creator verification required"}
        </Badge>
      </div>
      {!isVerified && (
        <div className="cv-verification-banner">
          <ShieldCheck size={28} />
          <div>
            <h3>
              Build your first collection. Become a verified creator to publish
              it.
            </h3>
            <p>
              Verification helps people know who stands behind the work they
              discover.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={data.user?.verification === "PENDING_REVIEW"}
            onClick={() => setVerificationOpen(true)}
          >
            {data.user?.verification === "PENDING_REVIEW"
              ? "Application pending"
              : "Apply for verification"}
            <ArrowRight size={15} />
          </Button>
        </div>
      )}
      <div className="cv-studio-tabs tabs">
        {[
          ["studio", Palette, "Hall designer"],
          ["dashboard", Layers3, "Overview"],
          ["events", Clock3, "Events & live"],
          ["questions", CircleHelp, "Question review"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            <Icon size={15} />
            {label}
            {key === "questions" && pendingQuestions.length > 0 && (
              <span className="cv-tab-count">{pendingQuestions.length}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "studio" && (
        <div className="cv-designer">
          <aside className="cv-studio-halls">
            <div className="cv-studio-halls-title">
              <span>YOUR HALLS</span>
              <button
                className="icon-button"
                onClick={() => choose("new")}
                aria-label="Create a new hall"
              >
                <Plus size={17} />
              </button>
            </div>
            {mine.map((item) => (
              <button
                key={item.id}
                className={`cv-studio-hall ${hallId === item.id ? "active" : ""}`}
                onClick={() => choose(item.id)}
              >
                <div className="cv-studio-hall-thumb">
                  <Art variant={item.cover || "sunset"} />
                </div>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.published ? "Published" : "Draft"} ·{" "}
                    {item.artworks?.length || 0} works
                  </small>
                </span>
              </button>
            ))}
            <button
              className={`cv-studio-hall cv-new-hall ${hallId === "new" ? "active" : ""}`}
              onClick={() => choose("new")}
            >
              <Plus size={18} />
              <span>New hall</span>
            </button>
            <div className="cv-studio-tip">
              <Sparkles size={19} />
              <strong>Start with a feeling.</strong>
              <p>
                A title, a few pieces, and a little of your story are all an
                open door needs.
              </p>
            </div>
          </aside>
          <section className="cv-designer-form">
            <div className="cv-designer-heading">
              <div>
                <h2>{hall ? "Shape your hall" : "A new world, yours"}</h2>
                <p>
                  {dirty
                    ? "You have unsaved changes."
                    : "Create a calm place for your collection."}
                </p>
              </div>
              <div className="row">
                <Button variant="secondary" onClick={() => setPreview(true)}>
                  <Eye size={15} /> Preview
                </Button>
                <Button onClick={save} disabled={busy}>
                  <Check size={15} />
                  {busy ? "Saving…" : "Save draft"}
                </Button>
              </div>
            </div>
            <section className="cv-design-assistant">
              <div>
                <Sparkles size={19} />
                <span>
                  <strong>A little help with the atmosphere</strong>
                  <small>
                    Built-in design assistant · uses approved palettes and
                    frames
                  </small>
                </span>
              </div>
              <p>
                Describe the mood. Preview a suggestion, then decide what
                belongs in your draft.
              </p>
              <div className="cv-design-prompt">
                <input
                  value={designPrompt}
                  onChange={(event) => setDesignPrompt(event.target.value)}
                  placeholder="A warm, quiet gallery for slow afternoons…"
                  maxLength={250}
                  aria-label="Hall design mood"
                />
                <Button
                  variant="secondary"
                  onClick={suggestDesign}
                  disabled={!designPrompt.trim()}
                >
                  Suggest <Sparkles size={13} />
                </Button>
              </div>
              {designProposal && (
                <div className="cv-design-proposal">
                  <p>{designProposal.message}</p>
                  <div>
                    <span>{designProposal.theme} walls</span>
                    <span>{designProposal.frame} frames</span>
                    <span>{designProposal.layout} arrangement</span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const { message, ...suggestion } = designProposal;
                      setDraft((current) => ({ ...current, ...suggestion }));
                      setDirty(true);
                      setDesignProposal(null);
                      toast(
                        "Design applied to your draft. Preview it before saving.",
                      );
                    }}
                  >
                    <Check size={14} /> Apply to draft
                  </Button>
                </div>
              )}
            </section>
            <div className="cv-hall-settings">
              <label className="field">
                Hall title
                <input
                  value={draft.title}
                  onChange={(event) => change("title", event.target.value)}
                  placeholder="A name for your little world"
                  maxLength={100}
                />
              </label>
              <label className="field">
                Your story
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    change("description", event.target.value)
                  }
                  placeholder="What will visitors discover here?"
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <div className="grid-2">
                <label className="field">
                  Wall palette
                  <select
                    value={draft.theme}
                    onChange={(event) => change("theme", event.target.value)}
                  >
                    <option value="sage">Warm sage</option>
                    <option value="clay">Soft clay</option>
                    <option value="lavender">Quiet lavender</option>
                    <option value="midnight">Midnight gallery</option>
                  </select>
                </label>
                <label className="field">
                  Who can enter?
                  <select
                    value={draft.access}
                    onChange={(event) => change("access", event.target.value)}
                  >
                    <option value="public">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="ticket">Creator-issued guest list</option>
                  </select>
                </label>
              </div>
              {draft.access === "ticket" && (
                <div className="cv-ticket-guests">
                  <label className="field">
                    Who has admission?
                    <select
                      multiple
                      size={5}
                      value={draft.ticketUserIds || []}
                      onChange={(event) =>
                        change(
                          "ticketUserIds",
                          Array.from(event.target.selectedOptions).map(
                            (option) => option.value,
                          ),
                        )
                      }
                    >
                      {(data.users || [])
                        .filter(
                          (user) => user.id !== data.user.id && !user.blocked,
                        )
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} · @{user.handle}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p>
                    Choose the people allowed to enter. Use Ctrl or Command to
                    select several. Admission is issued by you; no payment is
                    collected here.
                  </p>
                </div>
              )}
              <div className="cv-arrangement-settings">
                <label className="field">
                  Arrangement
                  <select
                    value={draft.layout || "editorial"}
                    onChange={(event) => change("layout", event.target.value)}
                  >
                    <option value="editorial">
                      Editorial · a gentle stagger
                    </option>
                    <option value="balanced">Balanced · equal frames</option>
                    <option value="salon">Salon · a closer collection</option>
                  </select>
                </label>
                <label className="field">
                  Frames
                  <select
                    value={draft.frame || "ivory"}
                    onChange={(event) => change("frame", event.target.value)}
                  >
                    <option value="ivory">Ivory</option>
                    <option value="oak">Oak</option>
                    <option value="black">Black</option>
                  </select>
                </label>
                <label className="field">
                  Light
                  <select
                    value={draft.lighting || "soft"}
                    onChange={(event) => change("lighting", event.target.value)}
                  >
                    <option value="soft">Soft</option>
                    <option value="warm">Warm</option>
                    <option value="bright">Bright</option>
                  </select>
                </label>
              </div>
              <div className="cv-cover-picker">
                <span>Cover artwork</span>
                <div>
                  {patterns.map((pattern) => (
                    <button
                      key={pattern}
                      className={draft.cover === pattern ? "selected" : ""}
                      onClick={() => change("cover", pattern)}
                      aria-label={`${pattern} cover`}
                    >
                      <Art variant={pattern} />
                      {draft.cover === pattern && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="cv-artwork-editor-header">
              <div>
                <h3>The collection</h3>
                <p>Your work, displayed with care.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  change("artworks", [
                    ...draft.artworks,
                    {
                      id: `art-${crypto.randomUUID()}`,
                      title: "",
                      description: "",
                      medium: "Digital artwork",
                      year: new Date().getFullYear().toString(),
                      variant:
                        patterns[draft.artworks.length % patterns.length],
                      url: "",
                      alt: "",
                      audioApproved: false,
                      purchaseUrl: "",
                      translations: {},
                      saleStatus: "not-for-sale",
                    },
                  ]);
                }}
              >
                <Plus size={15} /> Add artwork
              </Button>
            </div>
            <label className="cv-rights">
              <input
                type="checkbox"
                checked={rights}
                onChange={(event) => setRights(event.target.checked)}
              />
              <span>
                I own these artworks or have permission to upload and publish
                them.
              </span>
            </label>
            <div className="cv-artwork-editors">
              {draft.artworks.map((work, index) => (
                <article className="cv-artwork-editor" key={work.id}>
                  <div className="cv-artwork-editor-preview">
                    {artworkImage(work)}
                    <label className="cv-upload">
                      <Upload size={14} /> Upload image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => upload(event, work.id)}
                        disabled={busy}
                      />
                    </label>
                    <label className="field">
                      Built-in artwork
                      <select
                        value={work.variant || "sunset"}
                        onChange={(event) => {
                          workChange(work.id, "variant", event.target.value);
                          workChange(work.id, "url", "");
                        }}
                      >
                        {patterns.map((pattern) => (
                          <option key={pattern} value={pattern}>
                            {pattern}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="cv-artwork-editor-fields">
                    <div className="cv-artwork-editor-number">
                      <span>WORK {String(index + 1).padStart(2, "0")}</span>
                      <div className="row">
                        <button
                          className="icon-button"
                          onClick={() => moveWork(work.id, -1)}
                          disabled={index === 0}
                          aria-label="Move artwork earlier"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => moveWork(work.id, 1)}
                          disabled={index === draft.artworks.length - 1}
                          aria-label="Move artwork later"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() =>
                            change(
                              "artworks",
                              draft.artworks.filter(
                                (item) => item.id !== work.id,
                              ),
                            )
                          }
                          aria-label={`Remove ${work.title || "artwork"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <label className="field">
                      Title
                      <input
                        value={work.title}
                        onChange={(event) =>
                          workChange(work.id, "title", event.target.value)
                        }
                        placeholder="Artwork title"
                        maxLength={120}
                      />
                    </label>
                    <div className="grid-2">
                      <label className="field">
                        Medium
                        <input
                          value={work.medium || ""}
                          onChange={(event) =>
                            workChange(work.id, "medium", event.target.value)
                          }
                          placeholder="e.g. Acrylic on canvas"
                          maxLength={100}
                        />
                      </label>
                      <label className="field">
                        Year
                        <input
                          value={work.year || ""}
                          onChange={(event) =>
                            workChange(work.id, "year", event.target.value)
                          }
                          placeholder="2026"
                          maxLength={20}
                        />
                      </label>
                    </div>
                    <label className="field">
                      Description / audio guide
                      <textarea
                        value={work.description || ""}
                        onChange={(event) =>
                          workChange(work.id, "description", event.target.value)
                        }
                        placeholder="Describe your work in your own words."
                        maxLength={3000}
                        rows={3}
                      />
                    </label>
                    <label className="cv-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(work.audioApproved)}
                        onChange={(event) =>
                          workChange(
                            work.id,
                            "audioApproved",
                            event.target.checked,
                          )
                        }
                      />{" "}
                      I approve these descriptions for the spoken audio guide.
                    </label>
                    <details className="cv-translations">
                      <summary>Creator-written translations · optional</summary>
                      <p>
                        Only your supplied text is shown. No machine
                        translations or invented facts are added.
                      </p>
                      {[
                        ["es", "Spanish"],
                        ["fr", "French"],
                        ["hi", "Hindi"],
                      ].map(([code, label]) => (
                        <label className="field" key={code}>
                          {label}
                          <textarea
                            value={work.translations?.[code] || ""}
                            onChange={(event) =>
                              workChange(work.id, "translations", {
                                ...work.translations,
                                [code]: event.target.value,
                              })
                            }
                            rows={2}
                            maxLength={3000}
                            placeholder={`${label} description`}
                          />
                        </label>
                      ))}
                    </details>
                    <label className="field">
                      Sale status
                      <select
                        value={work.saleStatus || "not-for-sale"}
                        onChange={(event) =>
                          workChange(work.id, "saleStatus", event.target.value)
                        }
                      >
                        <option value="not-for-sale">Not for sale</option>
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                      </select>
                    </label>
                    <label className="field">
                      Image description for accessibility
                      <input
                        value={work.alt || ""}
                        onChange={(event) =>
                          workChange(work.id, "alt", event.target.value)
                        }
                        placeholder="Describe the colours, forms, and composition"
                        maxLength={400}
                      />
                    </label>
                    <div className="grid-2">
                      <label className="field">
                        External shop link · optional
                        <input
                          type="url"
                          value={work.purchaseUrl || ""}
                          onChange={(event) =>
                            workChange(
                              work.id,
                              "purchaseUrl",
                              event.target.value,
                            )
                          }
                          placeholder="https://your-shop.com/work"
                        />
                      </label>
                      <label className="field">
                        Price · optional
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={work.price ?? ""}
                          onChange={(event) =>
                            workChange(work.id, "price", event.target.value)
                          }
                          placeholder="120.00"
                        />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!draft.artworks.length && (
              <Empty icon={ImagePlus} title="Your walls are a blank canvas">
                Add your first artwork to begin the collection.
              </Empty>
            )}
            <div className="cv-publish-bar">
              <div>
                <strong>
                  {hall?.published
                    ? "Your hall is open to visitors."
                    : "Ready to open the doors?"}
                </strong>
                <p>
                  {isVerified
                    ? "Save your changes, then publish your collection."
                    : "Verification is required before publishing."}
                </p>
              </div>
              <Button
                variant={hall?.published ? "secondary" : "primary"}
                disabled={!isVerified || !hall?.id || dirty || busy}
                onClick={async () => {
                  const result = await perform("hall.publish", {
                    hallId: hall.id,
                    published: !hall.published,
                  });
                  if (result)
                    toast(
                      hall.published
                        ? "Hall unpublished. Your draft is saved."
                        : "Your hall is published. The doors are open!",
                    );
                }}
              >
                <DoorOpen size={16} />
                {hall?.published ? "Unpublish hall" : "Publish hall"}
              </Button>
            </div>
          </section>
        </div>
      )}
      {tab === "dashboard" && (
        <section className="cv-dashboard">
          <div className="cv-metrics">
            {[
              [Eye, "Total visits", metrics.visits],
              [Bookmark, "Artwork saves", metrics.saves],
              [Users, "Here right now", metrics.attendance],
              [Frame, "Artworks", metrics.artworks],
            ].map(([Icon, label, value]) => (
              <article key={label}>
                <Icon size={20} />
                <span>{label}</span>
                <strong>{count(value)}</strong>
              </article>
            ))}
          </div>
          <div className="cv-dashboard-header">
            <h2>Your worlds at a glance</h2>
            <Button
              variant="secondary"
              onClick={() => {
                choose("new");
                setTab("studio");
              }}
            >
              <Plus size={15} /> Create a hall
            </Button>
          </div>
          {mine.length ? (
            <div className="cv-dashboard-halls">
              {mine.map((item) => (
                <article key={item.id}>
                  <div className="cv-dashboard-hall-cover">
                    <Art variant={item.cover} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <Badge>{item.published ? "Published" : "Draft"}</Badge>
                    <p>
                      {count(item.visitors)} visits ·{" "}
                      {(item.artworks || []).reduce(
                        (sum, work) => sum + Number(work.saves || 0),
                        0,
                      )}{" "}
                      saves · {count(item.attendance)} here now
                    </p>
                  </div>
                  <div className="row">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        choose(item.id);
                        setTab("studio");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("hall", item.id)}
                    >
                      Visit <ArrowUpRight size={15} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty icon={Layers3} title="Your first world is waiting">
              Create a hall in the designer to see your activity here.
            </Empty>
          )}
          <p className="cv-metrics-note">
            These are actual aggregate counts. Visits count unique signed-in
            visitors, saves count current bookmarks, and “here now” uses live
            presence. No individual visitor tracking is shown.
          </p>
        </section>
      )}
      {tab === "events" && (
        <section className="cv-events-studio">
          <div className="cv-event-studio-header">
            <div>
              <h2>Bring your world to life.</h2>
              <p className="muted">
                Schedule a thoughtful moment or go live with your collection.
              </p>
            </div>
            <label className="field">
              Choose a hall
              <select
                value={hallId}
                onChange={(event) => choose(event.target.value)}
              >
                <option value="new">Select a saved hall</option>
                {mine.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hall ? (
            <div className="grid-2">
              <section className="cv-studio-panel">
                <div className="cv-panel-icon">
                  <Radio size={22} />
                </div>
                <h3>
                  {hall.live ? "Your hall is live." : "Open a live moment."}
                </h3>
                <p>
                  Choose works to spotlight, answer approved questions, and
                  share a voice or video tour.
                </p>
                <Button
                  disabled={!hall.published || !isVerified}
                  onClick={() =>
                    perform("hall.live", { hallId: hall.id, live: !hall.live })
                  }
                  variant={hall.live ? "secondary" : "primary"}
                >
                  {hall.live ? <Square size={15} /> : <Radio size={15} />}
                  {hall.live ? "End live moment" : "Go live"}
                </Button>
                {!hall.published && (
                  <small>Publish your hall before going live.</small>
                )}
                {hall.live && (
                  <>
                    <MediaCall
                      data={data}
                      act={act}
                      socket={socket}
                      toast={toast}
                      hall={hall}
                    />
                    <div className="cv-live-work-picker">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          perform("hall.questions", {
                            hallId: hall.id,
                            enabled: hall.questionsEnabled === false,
                          })
                        }
                      >
                        <CircleHelp size={14} />
                        {hall.questionsEnabled === false
                          ? "Open question submissions"
                          : "Pause new questions"}
                      </Button>
                      <label className="field">
                        Creator spotlight
                        <select
                          value={hall.spotlightId || ""}
                          onChange={(event) =>
                            perform("hall.spotlight", {
                              hallId: hall.id,
                              artworkId: event.target.value,
                            })
                          }
                        >
                          <option value="" disabled>
                            Select an artwork
                          </option>
                          {hall.artworks.map((work) => (
                            <option key={work.id} value={work.id}>
                              {work.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        variant="ghost"
                        onClick={() => navigate("hall", hall.id)}
                      >
                        Enter your live hall <ArrowUpRight size={14} />
                      </Button>
                      <Button
                        className="cv-emergency"
                        onClick={async () => {
                          const result = await perform("hall.live", {
                            hallId: hall.id,
                            live: false,
                          });
                          if (result)
                            toast(
                              "Live moment stopped. Visitors can still view your gallery.",
                            );
                        }}
                      >
                        <Square size={14} /> Emergency stop live
                      </Button>
                    </div>
                  </>
                )}
              </section>
              <section className="cv-studio-panel">
                <div className="cv-panel-icon">
                  <Clock3 size={22} />
                </div>
                <h3>Put a date on the calendar.</h3>
                <p>
                  Invite people to a tour, a new collection, or a conversation
                  around your work.
                </p>
                <form
                  className="stack"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (new Date(eventDate) <= new Date())
                      return toast("Choose a date and time in the future.");
                    const result = await perform("event.create", {
                      hallId: hall.id,
                      title: eventTitle,
                      date: new Date(eventDate).toISOString(),
                    });
                    if (result) {
                      setEventTitle("");
                      setEventDate("");
                      toast("Event scheduled. Visitors can RSVP in your hall.");
                    }
                  }}
                >
                  <label className="field">
                    Event title
                    <input
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      placeholder="An evening in the studio"
                      required
                      maxLength={120}
                    />
                  </label>
                  <label className="field">
                    Date and time · your local timezone
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      required
                      min={new Date(Date.now() + 60000)
                        .toLocaleString("sv")
                        .slice(0, 16)
                        .replace(" ", "T")}
                    />
                  </label>
                  <Button
                    disabled={!isVerified || !hall.published}
                    type="submit"
                  >
                    <Plus size={15} /> Schedule event
                  </Button>
                </form>
                <div className="cv-scheduled-list">
                  {hall.events?.map((event) => (
                    <div key={event.id}>
                      <strong>{event.title}</strong>
                      <span>
                        {dateLabel(event.date)} · {count(event.rsvps)} RSVPs
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <Empty icon={Clock3} title="Choose a saved hall">
              Save and publish a hall to schedule events and host live tours.
            </Empty>
          )}
        </section>
      )}
      {tab === "questions" && (
        <section className="cv-review-questions">
          <div className="cv-review-heading">
            <h2>Thoughtful questions, on your terms.</h2>
            <p>
              Review submissions before they appear in your hall. A question is
              never a public comment until you approve it.
            </p>
          </div>
          {pendingQuestions.length ? (
            pendingQuestions.map((item) => (
              <article className="cv-review-question" key={item.id}>
                <CircleHelp size={21} />
                <div>
                  <span>
                    {mine.find((world) => world.id === item.hallId)?.title} ·{" "}
                    {timeAgo(item.createdAt)}
                  </span>
                  <p>{item.text}</p>
                  <textarea
                    className="cv-question-reply"
                    value={questionAnswers[item.id] || ""}
                    onChange={(event) =>
                      setQuestionAnswers((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Your answer · optional"
                    maxLength={1000}
                    aria-label="Creator answer"
                  />
                </div>
                <div className="row">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      perform("hall.moderate", {
                        questionId: item.id,
                        approved: false,
                      })
                    }
                  >
                    <X size={14} /> Decline
                  </Button>
                  <Button
                    onClick={() =>
                      perform("hall.moderate", {
                        questionId: item.id,
                        approved: true,
                        answer: questionAnswers[item.id] || "",
                      })
                    }
                  >
                    <Check size={14} /> Approve
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <Empty icon={CheckCircle2} title="Your review queue is clear">
              New questions from your visitors will arrive here.
            </Empty>
          )}
        </section>
      )}
      {preview && (
        <Modal title="Hall preview" onClose={() => setPreview(false)} wide>
          <div
            className={`cv-preview cv-theme-${draft.theme} cv-layout-${draft.layout || "editorial"} cv-frame-${draft.frame || "ivory"} cv-lighting-${draft.lighting || "soft"}`}
          >
            <div className="eyebrow">A PRIVATE PREVIEW</div>
            <h2>{draft.title || "Your untitled world"}</h2>
            <p>{draft.description || "Your story will appear here."}</p>
            <div className="cv-preview-grid">
              {draft.artworks.map((work) => (
                <article key={work.id}>
                  {artworkImage(work)}
                  <h3>{work.title || "Untitled work"}</h3>
                  <p>
                    {work.medium}
                    {work.year ? `, ${work.year}` : ""}
                  </p>
                </article>
              ))}
            </div>
            {!draft.artworks.length && (
              <div className="cv-preview-empty">
                <Art variant={draft.cover} />
                <span>Add artworks to see your gallery.</span>
              </div>
            )}
          </div>
        </Modal>
      )}
      {verificationOpen && (
        <Modal
          title="Apply for creator verification"
          onClose={() => setVerificationOpen(false)}
        >
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await perform("verification.apply", application);
              if (result) {
                setVerificationOpen(false);
                toast("Application submitted for review.");
              }
            }}
          >
            <p className="muted">
              Tell the review team about your work. Approval is required before
              your hall can be published.
            </p>
            <label className="field">
              Creator name
              <input
                value={application.name}
                onChange={(event) =>
                  setApplication({ ...application, name: event.target.value })
                }
                required
                maxLength={100}
              />
            </label>
            <label className="field">
              Portfolio or website
              <input
                type="url"
                value={application.website}
                onChange={(event) =>
                  setApplication({
                    ...application,
                    website: event.target.value,
                  })
                }
                placeholder="https://"
                required
              />
            </label>
            <label className="field">
              Tell us about your work
              <textarea
                value={application.statement}
                onChange={(event) =>
                  setApplication({
                    ...application,
                    statement: event.target.value,
                  })
                }
                required
                maxLength={2000}
                rows={5}
              />
            </label>
            <Button type="submit">
              <ShieldCheck size={16} /> Submit application
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function AdminPage({ data, act, navigate, toast }) {
  const [tab, setTab] = useState("verification");
  if (data.user?.role !== "admin")
    return (
      <div className="cv-page">
        <Empty icon={ShieldCheck} title="This area is for moderators">
          Creator tools are available in your studio.
        </Empty>
        <Button variant="secondary" onClick={() => navigate("creator")}>
          Your creator studio
        </Button>
      </div>
    );
  const applications = (data.verificationRequests || []).filter(
    (item) =>
      !item.status || ["PENDING_REVIEW", "pending"].includes(item.status),
  );
  const reports = (data.reports || []).filter(
    (item) => !item.resolved && item.status !== "resolved",
  );
  async function perform(type, payload, message) {
    try {
      await act(type, payload);
      toast(message);
    } catch (error) {
      toast(error.message);
    }
  }
  return (
    <div className="cv-page cv-admin">
      <div className="page-heading">
        <div className="eyebrow">TRUST & CARE</div>
        <h1>Keep the doors welcoming.</h1>
        <p>Review creator applications and private safety reports.</p>
      </div>
      <div className="tabs">
        <button
          className={tab === "verification" ? "active" : ""}
          onClick={() => setTab("verification")}
        >
          <ShieldCheck size={16} />
          Creator applications{" "}
          <span className="cv-tab-count">{applications.length}</span>
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          <Flag size={16} />
          Safety reports <span className="cv-tab-count">{reports.length}</span>
        </button>
      </div>
      {tab === "verification" ? (
        <div className="cv-admin-queue">
          {applications.length ? (
            applications.map((item) => {
              const user = data.users?.find(
                (person) => person.id === item.userId,
              );
              const website = /^https?:\/\//i.test(item.website || "")
                ? item.website
                : null;
              return (
                <article className="cv-admin-item" key={item.id || item.userId}>
                  <div className="cv-admin-item-top">
                    <Avatar user={user} size={44} />
                    <div>
                      <h3>{item.name || user?.name}</h3>
                      <span>
                        @{user?.handle || "creator"} · {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    <Badge tone="amber">Awaiting review</Badge>
                  </div>
                  <p>{item.statement}</p>
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cv-review-link"
                    >
                      View portfolio <ExternalLink size={14} />
                    </a>
                  )}
                  <div className="cv-admin-item-actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        perform(
                          "verification.review",
                          { userId: item.userId, approved: false },
                          "Application declined.",
                        )
                      }
                    >
                      <X size={15} /> Decline
                    </Button>
                    <Button
                      onClick={() =>
                        perform(
                          "verification.review",
                          { userId: item.userId, approved: true },
                          "Creator verified. They can publish their halls.",
                        )
                      }
                    >
                      <Check size={15} /> Verify creator
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty icon={CheckCircle2} title="No applications waiting">
              New creator applications will appear here.
            </Empty>
          )}
        </div>
      ) : (
        <div className="cv-admin-queue">
          {reports.length ? (
            reports.map((item) => (
              <article key={item.id} className="cv-admin-item">
                <div className="cv-admin-item-top">
                  <Flag size={21} />
                  <div>
                    <h3>{item.reason}</h3>
                    <span>
                      {item.targetType} · {item.targetId} ·{" "}
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <Badge tone="amber">Open report</Badge>
                </div>
                {item.details && <p>{item.details}</p>}
                <div className="cv-admin-item-actions">
                  {item.targetType === "hall" && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate("hall", item.targetId)}
                    >
                      Review hall <ArrowUpRight size={14} />
                    </Button>
                  )}
                  {item.targetType === "hall" &&
                    data.halls?.find((hall) => hall.id === item.targetId)
                      ?.published && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          perform(
                            "hall.publish",
                            { hallId: item.targetId, published: false },
                            "Hall unpublished for review.",
                          )
                        }
                      >
                        <DoorOpen size={14} /> Unpublish hall
                      </Button>
                    )}
                  {item.targetType === "user" && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate("profile", item.targetId)}
                    >
                      Review profile <ArrowUpRight size={14} />
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      perform(
                        "report.resolve",
                        { reportId: item.id },
                        "Report marked reviewed.",
                      )
                    }
                  >
                    <Check size={15} /> Mark reviewed
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <Empty icon={ShieldCheck} title="No open reports">
              Private reports from the community will appear here.
            </Empty>
          )}
        </div>
      )}
    </div>
  );
}
