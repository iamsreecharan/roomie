import React, { useEffect, useRef, useState } from "react";
import { DoorOpen } from "lucide-react";
import { Avatar, Button, Modal } from "../lib.jsx";
import "./join-prompt.css";

// Keep admission explicit. A dismissed prompt remains reachable in the banner.
export default function JoinPrompt({ data, act, navigate, toast }) {
  const [promptId, setPromptId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const seen = useRef(new Set());
  const joined = useRef(new Set());
  const ready = (data.myVisits || []).filter(
    (visit) =>
      visit.status === "accepted" &&
      (visit.type === "knock"
        ? visit.fromId === data.user.id
        : visit.type === "invite" && visit.toId === data.user.id) &&
      Date.parse(visit.expiresAt) > clock &&
      !joined.current.has(visit.id),
  );
  const available = data.session ? [] : ready;
  const prompt = available.find((visit) => visit.id === promptId);
  const hostFor = (visit) =>
    data.users.find(
      (user) =>
        user.id ===
        (visit.hostId || (visit.type === "knock" ? visit.toId : visit.fromId)),
    );
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (data.session || busy || prompt) return;
    for (const visit of ready) {
      const key = `roomie:join-prompt:${data.user.id}:${visit.id}`;
      let remembered = false;
      try {
        remembered = sessionStorage.getItem(key) === "seen";
      } catch {
        /* Storage may be disabled. */
      }
      if (seen.current.has(visit.id) || remembered) continue;
      seen.current.add(visit.id);
      try {
        sessionStorage.setItem(key, "seen");
      } catch {
        /* The in-memory guard still prevents repeat prompts. */
      }
      setPromptId(visit.id);
      break;
    }
  }, [data, busy, clock, promptId]);
  async function join(visit) {
    if (busy) return;
    setBusy(visit.id);
    try {
      await act("session.join", { requestId: visit.id });
      joined.current.add(visit.id);
      setPromptId(null);
      navigate("room");
    } catch (error) {
      toast(error.message || "Couldn't join this room. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  if (!available.length) return null;
  return (
    <>
      <section
        className="join-notifications"
        aria-label="Rooms ready to join"
        aria-live="polite"
      >
        {available.map((visit) => {
          const host = hostFor(visit);
          return (
            <div className="join-notification" key={visit.id}>
              <Avatar user={host || { name: "Friend" }} size={40} />
              <div className="join-notification-copy">
                <strong>{host?.name || "Your friend"}'s room is ready</strong>
                <span>
                  {visit.type === "knock"
                    ? "Your knock was accepted. Come on in."
                    : "Your invitation is accepted. Come on in."}
                </span>
              </div>
              <Button onClick={() => join(visit)} disabled={!!busy}>
                <DoorOpen size={17} />
                {busy === visit.id ? "Joining…" : "Join room"}
              </Button>
            </div>
          );
        })}
      </section>
      {prompt && (
        <Modal
          title={
            prompt.type === "knock"
              ? "Your knock was accepted"
              : "You're invited in"
          }
          onClose={() => setPromptId(null)}
        >
          <div className="join-prompt-content">
            <Avatar user={hostFor(prompt) || { name: "Friend" }} size={88} />
            <h3>{hostFor(prompt)?.name || "Your friend"}'s room is ready</h3>
            <p>
              Join now, or come back to the invitation at the top whenever
              you're ready.
            </p>
            <Button onClick={() => join(prompt)} disabled={!!busy}>
              <DoorOpen size={18} />
              {busy === prompt.id ? "Joining…" : "Join room"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPromptId(null)}
              disabled={!!busy}
            >
              Not now
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
