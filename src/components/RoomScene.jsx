import React, { useRef, useState } from "react";
import { avatarPalette } from "./Avatar.jsx";

const themes = {
  sage: {
    wall: "#cbdacb",
    side: "#b5c9b9",
    floor: "#eee4d2",
    accent: "#e5a891",
  },
  clay: {
    wall: "#e8c8b4",
    side: "#d5ac96",
    floor: "#f0e2cd",
    accent: "#a8bca7",
  },
  midnight: {
    wall: "#748595",
    side: "#5d6e7d",
    floor: "#cfc3b4",
    accent: "#ddb486",
  },
  lavender: {
    wall: "#d6cfe1",
    side: "#bdb2d0",
    floor: "#ece4d5",
    accent: "#dba392",
  },
};
export const roomObjectDefaults = {
  sofa: { x: 39, y: 53, color: "#c97659" },
  rug: { x: 48, y: 70, color: "#eed2b0" },
  plant: { x: 76, y: 52, color: "#718f68" },
  desk: { x: 70, y: 59, color: "#b89873" },
  lamp: { x: 27, y: 49, color: "#e6c99f" },
  art: { x: 63, y: 31, color: "#d7a181" },
  shelf: { x: 20, y: 46, color: "#aa8966" },
  tv: { x: 72, y: 49, color: "#4c5653" },
  table: { x: 44, y: 65, color: "#c4aa85" },
  chair: { x: 70, y: 78, color: "#bd775e" },
};

function Furniture({ type, color }) {
  if (type === "sofa" || type === "couch")
    return (
      <g>
        <ellipse cx="6" cy="72" rx="142" ry="28" fill="#514a3d" opacity=".09" />
        <path d="M-126 6L-95-8L134 43L130 85L-116 31Z" fill="#a9513e" />
        <path
          d="M-117-48Q-115-59-103-55L103-9Q121-5 123 12L119 38L-118-15Z"
          fill={color || "#c97659"}
        />
        <path d="M-116-47L-112-9L-5 14L-4-22Z" fill="#da8d71" />
        <path d="M2-20L5 17L112 40L115 3Z" fill="#d28367" />
        <path d="M-118-11L-85-26L132 21L101 44Z" fill="#e0a085" />
        <path d="M-120 6L-121 34L101 83L102 49Z" fill="#c36c50" />
        <path d="M102 49L132 34L130 63L101 84Z" fill="#a9533d" />
        <path
          d="M-130-15Q-133-21-120-18L-98-13Q-90-9-90 0V30L-129 21Z"
          fill="#cf7b5e"
        />
        <path d="M100 35V14Q100 8 110 12L139 18V55L102 49Z" fill="#d98c6e" />
        <path
          d="M-114 34V44L-105 47V36M109 76V87L118 82V71"
          stroke="#76533f"
          strokeWidth="5"
        />
        <path d="M-88-18L-74-32L-39-21L-49 4Z" fill="#efe1bf" />
        <path d="M65 1L84-3L100 12L83 27Z" fill="#bdc9a6" />
        <path d="M-62-26L-65-4M-78-20L-80-8" stroke="#d0ba91" strokeWidth="2" />
      </g>
    );
  if (type === "rug")
    return (
      <g>
        <path
          d="M-126-20Q-94-64-17-58L125-20Q173-3 123 27L31 72Q5 84-27 75L-147 38Q-179 25-126-20Z"
          fill={color || "#eed2b0"}
        />
        <path
          d="M-110-14Q-81-49-20-44L102-12Q142 0 103 22L24 59Q4 67-22 60L-122 30Q-143 18-110-14Z"
          fill="none"
          stroke="#d9a078"
          strokeWidth="5"
        />
        <path
          d="M-88-5Q-61-33-24-29L81-2Q104 7 81 20L22 45Q5 52-15 45L-98 22Q-115 16-88-5Z"
          fill="none"
          stroke="#d9a078"
          strokeWidth="5"
        />
        <path
          d="M-65 3Q-43-14-22-12L61 8Q73 13 60 21L18 35L-72 12Z"
          fill="#d9a078"
          opacity=".55"
        />
      </g>
    );
  if (type === "plant")
    return (
      <g>
        <ellipse cy="36" rx="35" ry="11" fill="#5d5845" opacity=".1" />
        <path d="M-24-2L-16 38Q0 47 17 37L25-2Z" fill="#d0946c" />
        <ellipse cy="-2" rx="25" ry="10" fill="#e4ac81" />
        <ellipse cy="-4" rx="19" ry="6" fill="#836451" />
        <path
          d="M0-5V-87M0-43L-25-61M1-23L27-47M0-63L22-89M1-15L-24-36"
          stroke="#54724e"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M-1-71Q-40-118-35-67Q-26-43-1-48M0-50Q46-91 43-54Q30-26 1-30M1-76Q8-124 31-104Q44-91 1-67M0-26Q-48-60-38-28Q-26-8 0-13M1-20Q31-57 39-30Q43-14 1-9"
          fill={color || "#718f68"}
        />
        <path d="M-2-91Q-26-132-13-131Q11-124 3-76" fill="#88a77b" />
      </g>
    );
  if (type === "desk" || type === "table")
    return (
      <g>
        <ellipse cy="53" rx="80" ry="15" fill="#514a3d" opacity=".08" />
        <path
          d="M-69-10L-70 49M60 10L57 69M-24-27L-26 33"
          stroke="#8f7559"
          strokeWidth="7"
        />
        <path d="M-80-23L-20-45L82-20L22 8Z" fill={color || "#c1a07d"} />
        <path d="M-80-23V-15L22 15V8M22 8L82-20V-12L22 15" fill="#a28462" />
        {type === "desk" && (
          <>
            <path d="M-19-41L-19-83L27-71V-29Z" fill="#596562" />
            <path d="M-14-76L23-66V-36L-14-46Z" fill="#d7dccc" />
            <path d="M-17-32L34-19L20-12L-30-25Z" fill="#8a9590" />
            <path d="M-9-46L19-38" stroke="#9aaf9c" strokeWidth="2" />
            <path d="M48-24V-39L60-36V-22" fill="#f1ead9" />
            <path
              d="M59-36Q70-35 67-28L61-26"
              stroke="#f1ead9"
              fill="none"
              strokeWidth="3"
            />
            <path d="M-53-32L-36-38L-24-34L-40-28Z" fill="#e4bb82" />
            <path d="M-49-34L-32-30" stroke="#bf8e63" />
          </>
        )}
        {type === "table" && (
          <>
            <ellipse cx="4" cy="-18" rx="21" ry="8" fill="#e1b391" />
            <path d="M-12-19L-8-35L10-31L14-16" fill="#f5e9d1" />
            <path d="M-38-21L-9-13L-22-7L-51-14Z" fill="#adb99e" />
          </>
        )}
      </g>
    );
  if (type === "lamp")
    return (
      <g>
        <ellipse cy="42" rx="28" ry="10" fill="#5d5845" opacity=".1" />
        <path d="M0-79V33" stroke="#867654" strokeWidth="5" />
        <ellipse cy="33" rx="24" ry="8" fill="#96805e" />
        <path
          d="M-18-125L-37-76Q0-61 38-76L18-125Z"
          fill={color || "#e6c99f"}
        />
        <ellipse cy="-125" rx="18" ry="6" fill="#f0dfbd" />
        <ellipse cy="-76" rx="37" ry="10" fill="#f4dfb0" />
        <ellipse cy="-76" rx="12" ry="5" fill="#fce7b0" />
      </g>
    );
  if (type === "shelf" || type === "bookshelf")
    return (
      <g>
        <path
          d="M-50-102L-19-113L53-94V45L20 57L-50 36Z"
          fill={color || "#aa8966"}
        />
        <path d="M-45-93L17-77V44L-45 28Z" fill="#7f644b" />
        <path d="M20-79L48-90V36L20 48Z" fill="#bc9e79" />
        <path
          d="M-44-52L16-37V-30L-44-45M-44-14L16 1V8L-44-7M-44 23L16 38V45L-44 30"
          fill="#c7a784"
        />
        <path
          d="M-39-88L-32-87V-56L-39-58M-30-86L-22-84V-53L-30-55M-20-84L-13-82V-51L-20-53M-10-81L-3-79V-49L-10-51M0-79L9-76V-46L0-48"
          fill="#cf9c75"
        />
        <path
          d="M-30-86L-23-84V-53L-30-55M-11-81L-5-79V-49L-11-51"
          fill="#a7b9a0"
        />
        <path
          d="M-39-42L-30-40V-16L-39-18M-28-40L-19-38V-14L-28-16M-14-36L-5-34L0-7L-9-9"
          fill="#d9c699"
        />
        <path d="M-16-36L-8-34L-3-8L-11-10" fill="#9faaa3" />
        <path
          d="M-39 1L-1 10L-4 15L-42 6M-38 9L3 19L0 24L-41 14"
          fill="#cf8e73"
        />
        <path d="M0 5Q-5-13 7-10Q20-8 14 9Z" fill="#d2cab5" />
      </g>
    );
  if (type === "art" || type === "picture")
    return (
      <g>
        <path d="M-47-48L47-25V44L-47 21Z" fill="#b58b66" />
        <path d="M-41-40L41-20V36L-41 16Z" fill="#f4e3c5" />
        <path
          d="M-32 12Q-21-24-1-13Q17-3 32-18V25Z"
          fill={color || "#d7a181"}
        />
        <ellipse cx="8" cy="-14" rx="11" ry="12" fill="#dda661" />
        <path d="M-32 12Q-7-3 31 18V25Z" fill="#98aa8b" />
      </g>
    );
  if (type === "tv")
    return (
      <g>
        <path d="M-65-73L61-42V31L-65 0Z" fill={color || "#4c5653"} />
        <path d="M-59-66L55-38V22L-59-6Z" fill="#718c8c" />
        <path d="M-58-7L-17-31L4-17L25-33L54-1V22Z" fill="#a5b3a1" />
        <ellipse cx="24" cy="-21" rx="12" ry="13" fill="#e3c09a" />
        <path d="M-10 17V30L-28 31L16 43L28 37L-1 31V20" fill="#5c6460" />
      </g>
    );
  if (type === "chair")
    return (
      <g>
        <path d="M-25 0V49M21 8V58" stroke="#83674e" strokeWidth="5" />
        <path
          d="M-28-46Q-30-55-20-53L26-40V0L-27-13Z"
          fill={color || "#bd775e"}
        />
        <path d="M-30-8L-8-18L31-6L9 7Z" fill="#d99776" />
        <path d="M-30-8V2L9 14V7M9 7L31-6V3L9 14" fill="#bd775e" />
      </g>
    );
  return (
    <g>
      <path d="M-20-20L20-10V20L-20 10Z" fill={color || "#98ab91"} />
      <path d="M-20-20L0-30L40-20L20-10Z" fill="#c5d2b9" />
      <path d="M20-10L40-20V10L20 20Z" fill="#6f886a" />
    </g>
  );
}

export default function RoomScene({
  room,
  user,
  editing = false,
  selected,
  onSelect,
  onMove,
  onObjectClick,
  compact = false,
}) {
  const svgRef = useRef();
  const drag = useRef(null);
  const [dragging, setDragging] = useState(null);
  const theme = themes[room?.theme] || themes.sage;
  const objects = room?.objects || [];
  const colors = avatarPalette(user?.avatar);
  const hairStyle =
    {
      waves: "wave",
      long: "bob",
      short: "crop",
      fade: "crop",
      afro: "curls",
      bun: "braids",
    }[user?.avatar?.hairStyle] ||
    user?.avatar?.hairStyle ||
    "wave";
  const accessory = user?.avatar?.accessory || "none";
  const interactive = editing || Boolean(onObjectClick);
  const point = (event) => {
    const svg = svgRef.current;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  function startDrag(event, object) {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    drag.current = {
      id: object.id,
      x: object.x,
      y: object.y,
      px: p.x,
      py: p.y,
    };
    setDragging(object.id);
    onSelect?.(object.id);
  }
  function move(event) {
    if (!drag.current || !editing) return;
    const p = point(event),
      d = drag.current;
    onMove?.(
      d.id,
      Math.max(8, Math.min(90, d.x + (p.x - d.px) / 9)),
      Math.max(18, Math.min(88, d.y + (p.y - d.py) / 6.5)),
    );
  }
  function finish() {
    drag.current = null;
    setDragging(null);
  }
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 900 650"
      className={`room-scene ${compact ? "compact" : ""} ${editing ? "editing" : ""} ${!interactive ? "readonly" : ""}`}
      role="group"
      aria-label="Your cozy two-dimensional room"
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <defs>
        <linearGradient id="room-sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecc3a2" />
          <stop offset="1" stopColor="#efc8a1" />
        </linearGradient>
        <linearGradient id="room-floor" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={theme.floor} />
          <stop offset="1" stopColor="#d9c9af" />
        </linearGradient>
        <filter id="room-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse
        cx="450"
        cy="566"
        rx="327"
        ry="37"
        fill="#a89576"
        opacity=".13"
        filter="url(#room-shadow)"
      />
      <path d="M125 387L358 301L785 405L550 554Z" fill="#b6a58d" />
      <path
        d="M125 387V402L550 569V554M550 554L785 405V418L550 569"
        fill="#c3b195"
      />
      <path d="M125 157L358 79V301L125 387Z" fill={theme.side} />
      <path d="M358 79L785 179V405L358 301Z" fill={theme.wall} />
      <path d="M125 387L358 301L785 405L550 554Z" fill="url(#room-floor)" />
      <g stroke="#cfbea2" strokeWidth="1" opacity=".6">
        <path d="M162 374L590 527M211 357L631 500M262 338L673 473M310 321L716 446M382 307L171 420M444 322L232 444M507 338L297 470M574 354L364 496M641 370L431 523M708 387L500 550" />
      </g>
      <path
        d="M125 383L358 297L785 400"
        stroke="#a7b5a0"
        strokeWidth="7"
        fill="none"
      />
      <path
        d="M125 157L358 79L785 179"
        fill="none"
        stroke="#dce5d7"
        strokeWidth="9"
      />
      <path d="M402 139L540 171V286L402 252Z" fill="#f2eddc" />
      <path d="M410 149L532 177V274L410 245Z" fill="url(#room-sunset)" />
      <ellipse cx="495" cy="203" rx="20" ry="23" fill="#ffe2b5" />
      <path
        d="M410 226Q440 193 473 219Q497 243 532 231V274L410 245Z"
        fill="#b0ba9d"
      />
      <path
        d="M410 236Q446 223 471 244Q497 229 532 252V274L410 245Z"
        fill="#8ea58c"
      />
      <path d="M470 163V259M409 205L533 233" stroke="#f3ecdb" strokeWidth="6" />
      <path d="M396 137L407 140V257L396 254Z" fill="#b6a68d" />
      <path d="M398 252L540 286L549 282L409 246Z" fill="#eee7d5" />
      <path d="M541 169L562 177V294L541 288Z" fill="#ede8d7" opacity=".8" />
      <path
        d="M382 130L401 134V252L380 247Q390 194 382 130Z"
        fill="#f0ead9"
        opacity=".8"
      />
      <path
        d="M427 261L527 285L603 446L507 423Z"
        fill="#fce4b3"
        opacity=".18"
      />
      <path d="M172 189L234 166V220L172 243Z" fill="#eae3d0" />
      <path d="M178 193L228 175V214L178 233Z" fill="#e0c69c" />
      <path
        d="M180 226L225 184M181 207L225 199"
        stroke="#b7a67b"
        strokeWidth="2"
      />
      <path d="M689 235L727 244V266L689 257Z" fill="#f0e7d3" />
      <path
        d="M699 244L718 249M698 250L713 254"
        stroke="#a3ad91"
        strokeWidth="2"
      />
      {[...objects]
        .sort((a, b) =>
          a.type === "rug" ? -1 : b.type === "rug" ? 1 : a.y - b.y,
        )
        .map((object) => (
          <g
            key={object.id}
            transform={`translate(${object.x * 9} ${object.y * 6.5}) rotate(${object.rotation || 0})`}
            className={`room-object ${selected === object.id && editing ? "selected" : ""} ${dragging === object.id ? "dragging" : ""}`}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : "img"}
            aria-label={
              editing
                ? `${object.type}, use arrow keys to move`
                : interactive
                  ? `${object.type}, ${object.type === "desk" ? "open your private tools" : "inspect furniture"}`
                  : object.type
            }
            aria-pressed={editing ? selected === object.id : undefined}
            onPointerDown={(event) => startDrag(event, object)}
            onClick={() =>
              editing ? onSelect?.(object.id) : onObjectClick?.(object)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                editing ? onSelect?.(object.id) : onObjectClick?.(object);
              }
              if (
                editing &&
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              ) {
                event.preventDefault();
                onSelect?.(object.id);
                const step = event.shiftKey ? 3 : 1;
                onMove?.(
                  object.id,
                  Math.max(
                    8,
                    Math.min(
                      90,
                      object.x +
                        (event.key === "ArrowLeft"
                          ? -step
                          : event.key === "ArrowRight"
                            ? step
                            : 0),
                    ),
                  ),
                  Math.max(
                    18,
                    Math.min(
                      88,
                      object.y +
                        (event.key === "ArrowUp"
                          ? -step
                          : event.key === "ArrowDown"
                            ? step
                            : 0),
                    ),
                  ),
                );
              }
            }}
          >
            {selected === object.id && editing && (
              <ellipse
                cy="35"
                rx={object.type === "sofa" ? 150 : 68}
                ry="28"
                fill="#e97f5f"
                opacity=".15"
                stroke="#da7655"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            )}
            <Furniture type={object.type} color={object.color} />
          </g>
        ))}
      <g transform="translate(575 426)" aria-hidden="true">
        <ellipse cx="0" cy="89" rx="26" ry="9" fill="#605746" opacity=".14" />
        <path d="M-12 48L-16 82L-6 87L1 56L7 85L18 84L14 45Z" fill="#646957" />
        <path
          d="M-17 83Q-27 84-22 90L-4 91V85M8 84V90L29 92Q34 86 17 84"
          fill="#eee6d7"
        />
        <path
          d="M-20-2Q-31 3-28 31L-18 30L-15 14V49Q0 57 18 48L16 12L26 28L34 22Q28-3 14-4Z"
          fill={colors.outfit}
        />
        <path
          d="M-29 28L-29 35Q-22 44-18 34L-18 29M27 21L32 29Q38 30 39 24L34 18"
          fill={colors.skin}
        />
        {(hairStyle === "bob" || hairStyle === "braids") && (
          <path
            d="M-23-32Q-28-61-2-59Q27-60 26-31L27-7Q15 0 0-10Q-10 0-27-7Z"
            fill={colors.hair}
          />
        )}
        <path d="M-6-13V0Q0 8 7 0V-15" fill={colors.skin} />
        <ellipse cy="-30" rx="21" ry="25" fill={colors.skin} />
        {hairStyle === "wave" && (
          <path
            d="M-20-29Q-30-54-5-58Q20-65 23-35L15-26L12-41Q-8-30-16-40L-16-24Z"
            fill={colors.hair}
          />
        )}
        {hairStyle === "crop" && (
          <path
            d="M-21-34L-22-45Q-13-64 10-56Q30-53 22-30L15-44Q-3-37-16-46L-16-32Z"
            fill={colors.hair}
          />
        )}
        {hairStyle === "bob" && (
          <path
            d="M-24-28Q-29-59-1-60Q30-60 26-27L16-32L12-47Q0-38-20-40L-20-23Z"
            fill={colors.hair}
          />
        )}
        {hairStyle === "curls" && (
          <g fill={colors.hair}>
            <circle cx="-20" cy="-43" r="10" />
            <circle cx="-10" cy="-54" r="11" />
            <circle cx="5" cy="-55" r="12" />
            <circle cx="18" cy="-49" r="10" />
            <circle cx="25" cy="-38" r="9" />
            <circle cx="-24" cy="-30" r="8" />
          </g>
        )}
        {hairStyle === "braids" && (
          <g fill={colors.hair}>
            <path d="M-24-34Q-28-60-1-59Q29-62 26-35L20-28Q7-37-1-47Q-9-36-22-32Z" />
            <path d="M-25-35Q-34-12-20 3L-13-3Q-22-23-18-36M23-35Q34-13 23 4L15-2Q26-26 17-35" />
          </g>
        )}
        <ellipse cx="-7" cy="-27" rx="1.5" ry="2" fill="#30332d" />
        <ellipse cx="8" cy="-26" rx="1.5" ry="2" fill="#30332d" />
        <path
          d="M-5-17Q1-13 7-17"
          stroke="#915f4d"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {["glasses", "round-glasses"].includes(accessory) && (
          <g fill="none" stroke="#35443a" strokeWidth="1.5">
            <circle cx="-7" cy="-27" r="6" />
            <circle cx="8" cy="-26" r="6" />
            <path d="M-1-27L2-26" />
          </g>
        )}
        {accessory === "earrings" && (
          <g fill="none" stroke="#d7a542" strokeWidth="1.8">
            <ellipse cx="-21" cy="-17" rx="3" ry="5" />
            <ellipse cx="21" cy="-17" rx="3" ry="5" />
          </g>
        )}
        {accessory === "headphones" && (
          <g fill="none" stroke="#ece8dd" strokeWidth="4">
            <path d="M-25-29V-39Q-24-62 0-62Q26-63 26-38V-29" />
            <path
              d="M-24-33V-22M25-32V-21"
              stroke="#596d65"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        )}
        {accessory === "cap" && (
          <g>
            <path d="M-23-44Q-20-65 0-64Q23-66 26-45Z" fill="#73917c" />
            <path d="M-1-48Q18-55 35-44Q28-39 0-42Z" fill="#556c5a" />
          </g>
        )}
      </g>
    </svg>
  );
}
