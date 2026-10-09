import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Radio,
  Volume2,
  VolumeX,
  CircleAlert,
  LockKeyhole,
} from "lucide-react";
import Avatar from "./Avatar.jsx";
import "./media.css";

const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

function deviceError(error) {
  if (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError"
  )
    return "Permission was denied. Allow access in your browser settings, then try again.";
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError")
    return "No matching microphone or camera was found. Connect a device and try again.";
  if (error.name === "NotReadableError" || error.name === "TrackStartError")
    return "Your device is busy or unavailable. Close other apps using it and try again.";
  if (error.name === "AbortError")
    return "Sharing was cancelled. You can try again whenever you’re ready.";
  if (error.name === "SecurityError")
    return "Your browser requires a secure connection to use your microphone, camera, or screen.";
  return error.message || "The connection could not start. Please try again.";
}

function MediaElement({
  stream,
  local = false,
  sound = true,
  onBlocked,
  kind = "video",
}) {
  const ref = useRef(null);
  const tracks = stream
    ?.getTracks()
    .map((track) => `${track.id}:${track.muted}:${track.readyState}`)
    .join(",");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    element.srcObject = stream || null;
    if (stream?.getTracks().length)
      element.play().catch((error) => {
        if (!cancelled && !local && sound && error.name === "NotAllowedError")
          onBlocked?.();
      });
    return () => {
      cancelled = true;
      element.srcObject = null;
    };
  }, [stream, sound, tracks]);
  return kind === "audio" ? (
    <audio ref={ref} autoPlay playsInline muted={local || !sound} />
  ) : (
    <video ref={ref} autoPlay playsInline muted={local || !sound} />
  );
}

function hasLiveTrack(stream, kind) {
  return !!stream
    ?.getTracks()
    .some(
      (track) =>
        (!kind || track.kind === kind) &&
        track.readyState === "live" &&
        !track.muted,
    );
}

/** Device capture starts only after an explicit user action. Every peer belongs
 * to the current admitted session or a creator-to-viewer hall broadcast. */
export function MediaCall({ data, act, socket, toast, hall }) {
  const current = useRef({ data, act, toast, hall });
  current.current = { data, act, toast, hall };
  const engine = useRef(null);
  const container = useRef(null);
  const iceServers = useRef(DEFAULT_ICE);
  const [media, setMedia] = useState({
    active: false,
    busy: false,
    stream: null,
    microphone: false,
    camera: false,
    screen: false,
  });
  const [peers, setPeers] = useState([]);
  const [notice, setNotice] = useState("");
  const [sound, setSound] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const userId = data?.user?.id;
  const sessionId = data?.session?.id;
  const scopeId = hall ? `hall:${hall.id}` : sessionId;
  const isCreator = !!hall && hall.ownerId === userId;
  const me = data?.session?.participants?.find(
    (person) => person.userId === userId,
  );
  const canVoice = isCreator || (!hall && !!me?.permissions?.voice);
  const canScreen = isCreator || (!hall && !!me?.permissions?.screen);
  const creator =
    hall &&
    (data?.users?.find((person) => person.id === hall.ownerId) ||
      (isCreator ? data?.user : null));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (
          !cancelled &&
          Array.isArray(config?.iceServers) &&
          config.iceServers.length
        )
          iceServers.current = config.iceServers;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMedia({
      active: false,
      busy: false,
      stream: null,
      microphone: false,
      camera: false,
      screen: false,
    });
    setPeers([]);
    setNotice("");
    if (!socket || !userId || !scopeId) return;
    let alive = true;
    let joined = false;
    let starting = false;
    let changing = false;
    let publisher = false;
    let operation = 0;
    let local = null;
    let videoKind = null;
    let broadcasterId = null;
    let permissionOverride = null;
    let lastReported = "";
    const connections = new Map();
    const hallId = hall?.id;
    const hallMode = !!hallId;
    const emitSignal = (targetUserId, content) => {
      if (!joined || !socket.connected) return;
      socket.emit(
        hallMode ? "hall:signal" : "signal",
        { ...content, targetUserId, ...(hallMode ? { hallId } : {}) },
        (result) => {
          if (alive && result?.ok === false)
            report(result.error || "Your media access has changed.");
        },
      );
    };
    const report = (message) => {
      if (alive && message !== lastReported) {
        lastReported = message;
        setNotice(message);
        current.current.toast?.(message);
      }
    };
    const updateLocal = (busy) => {
      if (!alive) return;
      setMedia({
        active: joined,
        busy: busy ?? starting,
        stream: local,
        microphone: !!local
          ?.getAudioTracks()
          .some((track) => track.enabled && track.readyState === "live"),
        camera:
          videoKind === "camera" &&
          !!local
            ?.getVideoTracks()
            .some((track) => track.readyState === "live"),
        screen:
          videoKind === "screen" &&
          !!local
            ?.getVideoTracks()
            .some((track) => track.readyState === "live"),
      });
    };
    const updatePeers = () => {
      if (alive)
        setPeers(
          [...connections.values()].map((peer) => ({
            id: peer.id,
            stream: peer.stream,
            state: peer.pc.connectionState,
          })),
        );
    };
    const closePeer = (id) => {
      const peer = connections.get(id);
      if (!peer) return;
      connections.delete(id);
      clearTimeout(peer.connectTimer);
      peer.pc.ontrack = null;
      peer.pc.onconnectionstatechange = null;
      peer.pc.onicecandidate = null;
      peer.pc.onnegotiationneeded = null;
      peer.pc.close();
      peer.stream.getTracks().forEach((track) => track.stop());
      updatePeers();
    };
    const permissions = () => {
      if (hallMode)
        return {
          voice: current.current.hall?.ownerId === userId,
          screen: current.current.hall?.ownerId === userId,
          admitted: true,
        };
      const participant = current.current.data?.session?.participants?.find(
        (person) => person.userId === userId,
      );
      return {
        ...participant?.permissions,
        ...permissionOverride,
        admitted:
          !!participant && current.current.data?.session?.id === sessionId,
      };
    };
    const replaceTrack = async (kind, track) => {
      await Promise.all(
        [...connections.values()]
          .filter((peer) => peer[kind] && peer.pc.signalingState !== "closed")
          .map((peer) => peer[kind].sender.replaceTrack(track)),
      );
    };
    const removeVideo = async () => {
      const tracks = local?.getVideoTracks() || [];
      tracks.forEach((track) => {
        local.removeTrack(track);
        track.stop();
      });
      videoKind = null;
      await replaceTrack("video", null);
      updateLocal();
    };
    const stop = (send = true) => {
      operation++;
      if (send && socket.connected) {
        if (hallMode && joined)
          socket.emit(
            publisher ? "hall:broadcast" : "hall:unwatch",
            publisher ? { hallId, active: false } : { hallId },
          );
        else if (joined) socket.emit("call:leave", {});
      }
      joined = false;
      starting = false;
      publisher = false;
      broadcasterId = null;
      for (const id of [...connections.keys()]) closePeer(id);
      local?.getTracks().forEach((track) => track.stop());
      local = null;
      videoKind = null;
      updateLocal(false);
    };
    const request = (event, payload) =>
      new Promise((resolve, reject) => {
        if (!socket.connected) {
          reject(
            new Error("The connection is offline. Reconnect and try again."),
          );
          return;
        }
        socket.timeout(8000).emit(event, payload, (error, result) => {
          if (error)
            reject(new Error("The server did not respond. Please try again."));
          else if (!result?.ok)
            reject(new Error(result?.error || "You could not join this call."));
          else resolve(result);
        });
      });
    const ensurePeer = (id) => {
      if (!joined || !id || id === userId) return null;
      if (connections.has(id)) return connections.get(id);
      if (
        !hallMode &&
        !current.current.data?.session?.participants?.some(
          (person) =>
            person.userId === id &&
            (person.permissions?.voice || person.permissions?.screen),
        )
      )
        return null;
      if (hallMode && !publisher && id !== current.current.hall?.ownerId)
        return null;
      const pc = new RTCPeerConnection({ iceServers: iceServers.current });
      const direction = hallMode
        ? publisher
          ? "sendonly"
          : "recvonly"
        : "sendrecv";
      const initiator = hallMode ? publisher : userId.localeCompare(id) < 0;
      const peer = {
        id,
        pc,
        stream: new MediaStream(),
        pending: [],
        queue: Promise.resolve(),
        makingOffer: false,
        ignoreOffer: false,
      };
      peer.connectTimer = setTimeout(() => {
        if (
          alive &&
          joined &&
          pc.connectionState !== "connected" &&
          pc.connectionState !== "closed"
        )
          report(
            "We couldn’t establish this media connection. Try rejoining on another network.",
          );
      }, 22000);
      connections.set(id, peer);
      // Only the offerer creates transceivers. An answerer must use the ones
      // associated with the incoming offer, otherwise its capture can end up
      // on unnegotiated sender tracks while the offered tracks remain recvonly.
      if (initiator) {
        peer.audio = pc.addTransceiver("audio", {
          direction,
          ...(local ? { streams: [local] } : {}),
        });
        peer.video = pc.addTransceiver("video", {
          direction,
          ...(local ? { streams: [local] } : {}),
        });
      }
      pc.onicecandidate = (event) => {
        if (event.candidate)
          emitSignal(id, { candidate: event.candidate.toJSON() });
      };
      pc.ontrack = (event) => {
        if (
          !peer.stream.getTracks().some((track) => track.id === event.track.id)
        )
          peer.stream.addTrack(event.track);
        for (const name of ["mute", "unmute", "ended"])
          event.track.addEventListener(name, updatePeers);
        updatePeers();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") clearTimeout(peer.connectTimer);
        updatePeers();
        if (pc.connectionState === "failed")
          report("A media connection failed. Leave and rejoin to try again.");
      };
      pc.onnegotiationneeded = async () => {
        if (
          !initiator ||
          !joined ||
          peer.makingOffer ||
          pc.signalingState !== "stable"
        )
          return;
        try {
          peer.makingOffer = true;
          if (local)
            await Promise.all([
              peer.audio.sender.replaceTrack(local.getAudioTracks()[0] || null),
              peer.video.sender.replaceTrack(local.getVideoTracks()[0] || null),
            ]);
          await pc.setLocalDescription(await pc.createOffer());
          emitSignal(id, { description: pc.localDescription.toJSON() });
        } catch (error) {
          if (alive && joined && pc.signalingState !== "closed")
            report(deviceError(error));
        } finally {
          peer.makingOffer = false;
        }
      };
      updatePeers();
      return peer;
    };
    const receiveSignal = (payload) => {
      if (!joined || (hallMode && payload?.hallId !== hallId)) return;
      const peer = ensurePeer(payload?.fromUserId);
      if (!peer) return;
      peer.queue = peer.queue
        .then(async () => {
          if (!joined || peer.pc.signalingState === "closed") return;
          const { description, candidate } = payload;
          if (description) {
            const collision =
              description.type === "offer" &&
              (peer.makingOffer || peer.pc.signalingState !== "stable");
            const polite = hallMode
              ? !publisher
              : userId.localeCompare(peer.id) > 0;
            peer.ignoreOffer = !polite && collision;
            if (peer.ignoreOffer) return;
            if (collision)
              await peer.pc.setLocalDescription({ type: "rollback" });
            await peer.pc.setRemoteDescription(description);
            if (description.type === "offer") {
              for (const kind of ["audio", "video"]) {
                const transceiver = peer.pc
                  .getTransceivers()
                  .find(
                    (item) =>
                      item.mid !== null && item.receiver.track.kind === kind,
                  );
                if (!transceiver) continue;
                peer[kind] = transceiver;
                transceiver.direction = hallMode ? "recvonly" : "sendrecv";
                if (local && !hallMode) {
                  transceiver.sender.setStreams?.(local);
                  await transceiver.sender.replaceTrack(
                    local.getTracks().find((track) => track.kind === kind) ||
                      null,
                  );
                }
              }
            }
            for (const pending of peer.pending.splice(0))
              await peer.pc.addIceCandidate(pending);
            if (description.type === "offer") {
              await peer.pc.setLocalDescription(await peer.pc.createAnswer());
              emitSignal(peer.id, {
                description: peer.pc.localDescription.toJSON(),
              });
            }
          } else if (candidate && !peer.ignoreOffer) {
            if (peer.pc.remoteDescription)
              await peer.pc.addIceCandidate(candidate);
            else peer.pending.push(candidate);
          }
        })
        .catch((error) => {
          if (alive && joined && peer.pc.signalingState !== "closed")
            report(deviceError(error));
        });
    };
    const setVideo = async (track, kind) => {
      for (const old of local.getVideoTracks()) {
        local.removeTrack(old);
        old.stop();
      }
      local.addTrack(track);
      videoKind = kind;
      await replaceTrack("video", track);
      track.addEventListener(
        "ended",
        () => {
          if (local?.getVideoTracks().includes(track))
            removeVideo().catch(() => {});
        },
        { once: true },
      );
      updateLocal();
    };
    const supportsMedia = (kind) => {
      if (!globalThis.RTCPeerConnection || !globalThis.MediaStream)
        throw new Error(
          "Your browser does not support live media. Try a current version of Chrome, Safari, or Firefox.",
        );
      if (kind !== "watch" && !navigator.mediaDevices)
        throw new Error(
          "Open Roomverse over HTTPS to use your microphone, camera, or screen.",
        );
      if (kind === "screen" && !navigator.mediaDevices.getDisplayMedia)
        throw new Error(
          "Screen sharing is unavailable in this browser. Try a supported desktop browser.",
        );
    };
    const start = async (kind) => {
      if (starting || joined) return;
      const access = permissions();
      if (
        !hallMode &&
        (!access.admitted ||
          !(kind === "screen" ? access.screen : access.voice))
      ) {
        report("The room host has not enabled this permission for you.");
        return;
      }
      if (
        hallMode &&
        kind !== "watch" &&
        current.current.hall?.ownerId !== userId
      )
        return;
      const token = ++operation;
      let captured = null;
      try {
        supportsMedia(kind);
        starting = true;
        lastReported = "";
        setNotice("");
        setPlaybackBlocked(false);
        updateLocal(true);
        if (kind === "screen")
          captured = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        else if (kind !== "watch")
          captured = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video:
              kind === "camera"
                ? { width: { ideal: 1280 }, height: { ideal: 720 } }
                : false,
          });
        if (!alive || token !== operation) {
          captured?.getTracks().forEach((track) => track.stop());
          return;
        }
        const latestAccess = permissions();
        if (
          !hallMode &&
          (!latestAccess.admitted ||
            !(kind === "screen" ? latestAccess.screen : latestAccess.voice))
        )
          throw new Error(
            "Your room permissions changed while the call was starting.",
          );
        local = captured;
        videoKind = kind === "screen" || kind === "camera" ? kind : null;
        publisher = hallMode && kind !== "watch";
        if (publisher && !current.current.hall?.live)
          await current.current.act("hall.live", { hallId, live: true });
        if (!alive || token !== operation) {
          captured?.getTracks().forEach((track) => track.stop());
          return;
        }
        // Set joined before the ack: a peer offer may arrive during registration.
        joined = true;
        const result = await request(
          hallMode
            ? publisher
              ? "hall:broadcast"
              : "hall:watch"
            : "call:join",
          hallMode ? { hallId, ...(publisher ? { active: true } : {}) } : {},
        );
        if (!alive || token !== operation) {
          captured?.getTracks().forEach((track) => track.stop());
          return;
        }
        if (hallMode && !publisher)
          broadcasterId = result.broadcasterId || null;
        if (!hallMode)
          for (const id of result.participants || [])
            ensurePeer(typeof id === "string" ? id : id.userId);
        if (hallMode && !publisher && broadcasterId) ensurePeer(broadcasterId);
        for (const track of local?.getTracks() || [])
          track.addEventListener(
            "ended",
            () => {
              if (
                track.kind === "video" &&
                local?.getVideoTracks().includes(track)
              )
                removeVideo().catch(() => {});
              else updateLocal();
            },
            { once: true },
          );
        starting = false;
        updateLocal(false);
      } catch (error) {
        captured?.getTracks().forEach((track) => track.stop());
        if (alive && token === operation) {
          stop();
          report(deviceError(error));
        }
      }
    };
    const toggleMicrophone = async () => {
      if (changing || !joined || !permissions().voice) return;
      changing = true;
      try {
        const tracks =
          local
            ?.getAudioTracks()
            .filter((track) => track.readyState === "live") || [];
        if (tracks.length) {
          const enabled = !tracks[0].enabled;
          tracks.forEach((track) => {
            track.enabled = enabled;
          });
        } else {
          const token = operation;
          const captured = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          if (!joined || token !== operation || !permissions().voice) {
            captured.getTracks().forEach((track) => track.stop());
            return;
          }
          local ||= new MediaStream();
          const track = captured.getAudioTracks()[0];
          local.addTrack(track);
          await replaceTrack("audio", track);
        }
        updateLocal();
      } catch (error) {
        report(deviceError(error));
      } finally {
        changing = false;
      }
    };
    const toggleCamera = async () => {
      if (changing || !joined || !permissions().voice) return;
      changing = true;
      try {
        if (videoKind === "camera") {
          await removeVideo();
          return;
        }
        const token = operation;
        const captured = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!joined || token !== operation || !permissions().voice) {
          captured.getTracks().forEach((track) => track.stop());
          return;
        }
        local ||= new MediaStream();
        await setVideo(captured.getVideoTracks()[0], "camera");
      } catch (error) {
        report(deviceError(error));
      } finally {
        changing = false;
      }
    };
    const toggleScreen = async () => {
      if (changing || !joined || !permissions().screen) return;
      changing = true;
      try {
        if (videoKind === "screen") {
          await removeVideo();
          return;
        }
        supportsMedia("screen");
        const token = operation;
        const captured = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        if (!joined || token !== operation || !permissions().screen) {
          captured.getTracks().forEach((track) => track.stop());
          return;
        }
        local ||= new MediaStream();
        await setVideo(captured.getVideoTracks()[0], "screen");
      } catch (error) {
        report(deviceError(error));
      } finally {
        changing = false;
      }
    };
    const syncPermissions = (resetOverride = true) => {
      if (resetOverride) permissionOverride = null;
      if (!joined) return;
      if (hallMode) {
        if (!starting && !current.current.hall?.live) {
          stop();
          setNotice("This live event has ended.");
        }
        return;
      }
      const access = permissions();
      if (!access.admitted || (!access.voice && !access.screen)) {
        stop();
        setNotice("The host has ended your media access.");
        return;
      }
      if (!access.voice) {
        local?.getAudioTracks().forEach((track) => {
          local.removeTrack(track);
          track.stop();
        });
        replaceTrack("audio", null).catch(() => {});
        if (videoKind === "camera") removeVideo().catch(() => {});
      }
      if (!access.screen && videoKind === "screen")
        removeVideo().catch(() => {});
      for (const id of connections.keys())
        if (
          !current.current.data?.session?.participants?.some(
            (person) =>
              person.userId === id &&
              (person.permissions?.voice || person.permissions?.screen),
          )
        )
          closePeer(id);
      updateLocal();
    };
    const peerList = (payload) => {
      if (hallMode || !joined) return;
      const ids = (
        Array.isArray(payload) ? payload : payload?.participants || []
      ).map((item) => (typeof item === "string" ? item : item.userId));
      for (const id of ids) ensurePeer(id);
      for (const id of connections.keys()) if (!ids.includes(id)) closePeer(id);
    };
    const peerLeft = (payload) => {
      if (!hallMode) closePeer(payload?.userId);
    };
    const hallViewer = (payload) => {
      if (joined && publisher && payload?.hallId === hallId)
        ensurePeer(payload.userId);
    };
    const hallViewerLeft = (payload) => {
      if (payload?.hallId === hallId) closePeer(payload.userId);
    };
    const hallBroadcaster = (payload) => {
      if (!hallMode || publisher || !joined || payload?.hallId !== hallId)
        return;
      if (broadcasterId && broadcasterId !== payload.userId)
        closePeer(broadcasterId);
      broadcasterId = payload.userId || null;
      if (broadcasterId) ensurePeer(broadcasterId);
    };
    const revoked = () => {
      if (!hallMode) {
        stop();
        setNotice("This room session has ended or your access was removed.");
      }
    };
    const permissionsChanged = (payload) => {
      if (!hallMode) {
        permissionOverride = payload?.permissions || null;
        syncPermissions(false);
      }
    };
    const disconnected = () => {
      stop(false);
      setNotice(
        "The connection was interrupted. Rejoin when you’re back online.",
      );
    };
    const handlers = [
      [hallMode ? "hall:signal" : "signal", receiveSignal],
      ["call:peers", peerList],
      ["call:peer-left", peerLeft],
      ["hall:viewer", hallViewer],
      ["hall:viewer-left", hallViewerLeft],
      ["hall:broadcaster", hallBroadcaster],
      ["session:ended", revoked],
      ["session:revoked", revoked],
      ["session:permissions", permissionsChanged],
      ["disconnect", disconnected],
    ];
    for (const [event, handler] of handlers) socket.on(event, handler);
    engine.current = {
      start,
      stop,
      toggleMicrophone,
      toggleCamera,
      toggleScreen,
      syncPermissions,
    };
    return () => {
      alive = false;
      for (const [event, handler] of handlers) socket.off(event, handler);
      stop();
      engine.current = null;
    };
  }, [socket, userId, scopeId]);

  useEffect(() => {
    engine.current?.syncPermissions();
  }, [data?.session, hall?.live]);

  if (!hall && !me) return null;
  const livePeers = peers.filter(
    (peer) => peer.state === "connected" && hasLiveTrack(peer.stream),
  );
  const outboundPeers =
    isCreator && hasLiveTrack(media.stream)
      ? peers.filter((peer) => peer.state === "connected")
      : [];
  const connected = isCreator ? outboundPeers.length > 0 : livePeers.length > 0;
  const mainPeer = hall && peers.find((peer) => peer.id === hall.ownerId);
  const leave = async () => {
    engine.current?.stop();
    if (isCreator && hall.live) {
      try {
        await act("hall.live", { hallId: hall.id, live: false });
      } catch (error) {
        toast?.(error.message);
      }
    }
  };
  const personFor = (id) =>
    id === userId ? data.user : data?.users?.find((person) => person.id === id);
  const soundBlocked = () => {
    setPlaybackBlocked(true);
  };
  const enableSound = () => {
    setSound(true);
    // Re-render the media elements after this user gesture to retry autoplay.
    setPlaybackBlocked(false);
    container.current?.querySelectorAll("audio, video").forEach((element) => {
      if (!element.closest("[data-local-media]")) {
        element.muted = false;
        element.play().catch(soundBlocked);
      }
    });
  };

  return (
    <section
      ref={container}
      className={`rv-media-call ${hall ? "rv-media-hall" : ""}`}
      aria-label={hall ? "Creator live broadcast" : "Private room call"}
    >
      <div className="rv-media-heading">
        <div className="rv-media-heading-icon">
          {hall ? <Radio size={19} /> : <Mic size={19} />}
        </div>
        <div>
          <h3>
            {hall
              ? isCreator
                ? "Your live stage"
                : "Live from the gallery"
              : "A little closer, in real time"}
          </h3>
          <p>
            {hall
              ? "One creator. A shared moment."
              : "Voice, video, and screen sharing in this private room."}
          </p>
        </div>
        <span className={`rv-media-status ${connected ? "is-live" : ""}`}>
          <i />
          {connected
            ? hall
              ? isCreator
                ? `Broadcasting to ${outboundPeers.length}`
                : "Receiving live media"
              : `${livePeers.length + 1} in call`
            : media.active
              ? hall && !isCreator
                ? "Waiting for creator"
                : peers.some((peer) => peer.state === "connected")
                  ? "Waiting for media"
                  : peers.length
                    ? "Connecting…"
                    : hall
                      ? "Broadcast ready"
                      : "Only you so far"
              : hall?.live
                ? "Live event"
                : "Devices off"}
        </span>
      </div>

      {notice && (
        <div className="rv-media-notice" role="status">
          <CircleAlert size={17} />
          <span>{notice}</span>
        </div>
      )}

      {hall && media.active && (
        <div
          className="rv-media-stage"
          data-local-media={isCreator || undefined}
        >
          {(
            isCreator
              ? media.camera || media.screen
              : mainPeer && hasLiveTrack(mainPeer.stream, "video")
          ) ? (
            <MediaElement
              stream={isCreator ? media.stream : mainPeer.stream}
              local={isCreator}
              sound={sound}
              onBlocked={soundBlocked}
            />
          ) : (
            <div className="rv-media-stage-placeholder">
              <Radio size={38} />
              <h4>
                {isCreator
                  ? media.microphone
                    ? "Your voice is on stage"
                    : "Your stage is ready"
                  : mainPeer && hasLiveTrack(mainPeer.stream, "audio")
                    ? "Listening to the creator"
                    : "Waiting for the creator’s stream"}
              </h4>
              <p>
                {isCreator
                  ? "Your audience can watch and listen. Their cameras and microphones stay off."
                  : "Your camera and microphone stay off in the gallery."}
              </p>
            </div>
          )}
          {!isCreator &&
            mainPeer &&
            !hasLiveTrack(mainPeer.stream, "video") && (
              <MediaElement
                kind="audio"
                stream={mainPeer.stream}
                sound={sound}
                onBlocked={soundBlocked}
              />
            )}
          <div className="rv-media-stage-label">
            <span>
              {creator?.name || "Gallery creator"}
              {isCreator ? " · You" : ""}
            </span>
            <span>{hall.attendance || 0} in gallery</span>
          </div>
        </div>
      )}

      {!hall && media.active && (
        <div className="rv-media-grid">
          <div
            className="rv-media-tile is-local"
            data-local-media
            data-screen={media.screen || undefined}
          >
            {media.camera || media.screen ? (
              <MediaElement stream={media.stream} local />
            ) : (
              <div className="rv-media-person">
                <Avatar user={data.user} size={72} />
                <span>
                  {media.microphone ? <Mic size={17} /> : <MicOff size={17} />}
                </span>
              </div>
            )}
            <div className="rv-media-tile-label">
              <span>You{media.screen ? " · sharing screen" : ""}</span>
              <span>{media.microphone ? "Mic on" : "Muted"}</span>
            </div>
          </div>
          {peers.map((peer) => (
            <div className="rv-media-tile" key={peer.id}>
              {hasLiveTrack(peer.stream, "video") ? (
                <MediaElement
                  stream={peer.stream}
                  sound={sound}
                  onBlocked={soundBlocked}
                />
              ) : (
                <>
                  <div className="rv-media-person">
                    <Avatar user={personFor(peer.id)} size={72} />
                    <span>
                      {hasLiveTrack(peer.stream, "audio") ? (
                        <Mic size={17} />
                      ) : (
                        <MicOff size={17} />
                      )}
                    </span>
                  </div>
                  <MediaElement
                    kind="audio"
                    stream={peer.stream}
                    sound={sound}
                    onBlocked={soundBlocked}
                  />
                </>
              )}
              <div className="rv-media-tile-label">
                <span>{personFor(peer.id)?.name || "Room guest"}</span>
                <span>
                  {peer.state === "connected" && hasLiveTrack(peer.stream)
                    ? "Live media"
                    : peer.state === "failed"
                      ? "Connection failed"
                      : peer.state === "disconnected"
                        ? "Reconnecting"
                        : peer.state === "connected"
                          ? "Media off"
                          : "Connecting"}
                </span>
              </div>
            </div>
          ))}
          {!peers.length && (
            <div className="rv-media-waiting">
              <span className="rv-media-waiting-rings">
                <Mic size={22} />
              </span>
              <strong>Your room, your pace</strong>
              <p>
                When another admitted guest joins the call, you’ll connect here.
              </p>
            </div>
          )}
        </div>
      )}

      {!media.active && (
        <div className="rv-media-intro">
          <div className="rv-media-intro-copy">
            <span className="rv-media-mini-label">
              <LockKeyhole size={13} />
              {hall ? "Audience devices stay off" : "Only admitted room guests"}
            </span>
            <p>
              {hall
                ? isCreator
                  ? "Choose how you’d like to go live. Nothing is captured until you start."
                  : hall.live
                    ? "Watch the creator’s stream. Joining never asks for your camera or microphone."
                    : "The creator isn’t live right now. Come back for the next shared moment."
                : canVoice || canScreen
                  ? "Your devices stay off until you choose to join. Up to six people can join a room call."
                  : "The host can enable voice or screen sharing for you in room permissions."}
            </p>
          </div>
          <div className="rv-media-start-actions">
            {(!hall || isCreator) && canVoice && (
              <>
                <button
                  className="rv-media-button is-primary"
                  disabled={media.busy || !socket?.connected}
                  onClick={() => engine.current?.start("voice")}
                >
                  <Mic size={16} />
                  {media.busy
                    ? "Starting…"
                    : hall
                      ? "Broadcast voice"
                      : "Join voice"}
                </button>
                <button
                  className="rv-media-button"
                  disabled={media.busy || !socket?.connected}
                  onClick={() => engine.current?.start("camera")}
                >
                  <Video size={16} />
                  {hall ? "Broadcast video" : "Join video"}
                </button>
              </>
            )}
            {(!hall || isCreator) && canScreen && (
              <button
                className={`rv-media-button ${canVoice ? "" : "is-primary"}`}
                disabled={media.busy || !socket?.connected}
                onClick={() => engine.current?.start("screen")}
              >
                <MonitorUp size={16} />
                {media.busy
                  ? "Starting…"
                  : hall
                    ? "Broadcast screen"
                    : "Share screen"}
              </button>
            )}
            {hall && !isCreator && (
              <button
                className="rv-media-button is-primary"
                disabled={media.busy || !hall.live || !socket?.connected}
                onClick={() => engine.current?.start("watch")}
              >
                <Radio size={16} />
                {media.busy ? "Joining…" : "Watch live"}
              </button>
            )}
          </div>
        </div>
      )}

      {media.active && (
        <div className="rv-media-controls">
          {(!hall || isCreator) && (
            <>
              {canVoice && (
                <button
                  className={`rv-media-button ${!media.microphone ? "is-muted" : ""}`}
                  aria-pressed={!media.microphone}
                  onClick={() => engine.current?.toggleMicrophone()}
                >
                  {media.microphone ? <Mic size={17} /> : <MicOff size={17} />}
                  {media.microphone ? "Mute" : "Unmute"}
                </button>
              )}
              {canVoice && (
                <button
                  className={`rv-media-button ${media.camera ? "is-selected" : ""}`}
                  aria-pressed={media.camera}
                  onClick={() => engine.current?.toggleCamera()}
                >
                  {media.camera ? <Video size={17} /> : <VideoOff size={17} />}
                  {media.camera ? "Camera off" : "Camera on"}
                </button>
              )}
              {canScreen && (
                <button
                  className={`rv-media-button ${media.screen ? "is-selected" : ""}`}
                  aria-pressed={media.screen}
                  onClick={() => engine.current?.toggleScreen()}
                >
                  <MonitorUp size={17} />
                  {media.screen ? "Stop sharing" : "Share screen"}
                </button>
              )}
            </>
          )}
          {(!hall || !isCreator) && (
            <button
              className="rv-media-button"
              aria-pressed={!sound}
              onClick={() => setSound(!sound)}
            >
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              {sound ? "Sound on" : "Sound off"}
            </button>
          )}
          <button className="rv-media-button is-end" onClick={leave}>
            <PhoneOff size={17} />
            {hall
              ? isCreator
                ? "End broadcast"
                : "Stop watching"
              : "Leave call"}
          </button>
        </div>
      )}
      {playbackBlocked && media.active && (
        <div className="rv-media-playback">
          <Volume2 size={16} />
          <span>Your browser paused playback.</span>
          <button onClick={enableSound}>Play live sound</button>
        </div>
      )}
    </section>
  );
}

export default MediaCall;
