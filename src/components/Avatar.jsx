import React, { useId } from "react";

const skinColors = {
  porcelain: "#f5d9c8",
  peach: "#eebfa1",
  rose: "#e5ad96",
  honey: "#ce9b71",
  bronze: "#aa7450",
  cocoa: "#80513c",
  espresso: "#533a2e",
  umber: "#3d2c25",
};
const hairColors = {
  ink: "#292734",
  brown: "#684634",
  auburn: "#a4533b",
  blonde: "#dfb76a",
  silver: "#d1d3df",
  rose: "#c26d86",
  blue: "#4b739d",
  violet: "#81719c",
  teal: "#426c6b",
};
const outfitColors = {
  coral: "#d77d66",
  sage: "#7e9f87",
  cream: "#dbc8a3",
  blue: "#779bb9",
  plum: "#947694",
  mustard: "#c8a15b",
  black: "#404756",
  mint: "#78b4ad",
  indigo: "#6474ac",
};
const eyeColors = {
  hazel: "#857351",
  blue: "#608ca3",
  brown: "#6c4939",
  green: "#608374",
  amber: "#b08a4e",
  grey: "#7d8390",
};
export const avatarOptions = {
  skin: skinColors,
  hair: hairColors,
  outfit: outfitColors,
  eyes: eyeColors,
};
export const avatarStyles = {
  outfitStyle: [
    { id: "hoodie", label: "Cozy hoodie" },
    { id: "jacket", label: "Studio jacket" },
    { id: "tee", label: "Everyday tee" },
    { id: "knit", label: "Soft knit" },
  ],
  expression: [
    { id: "smile", label: "Soft smile" },
    { id: "grin", label: "Big energy" },
    { id: "calm", label: "Feeling calm" },
    { id: "wink", label: "A little playful" },
  ],
};

const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function color(value, options, fallback) {
  if (typeof value !== "string") return fallback;
  if (Object.prototype.hasOwnProperty.call(options, value))
    return options[value];
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))
    return fallback;
  const hex = value.slice(1);
  return hex.length < 5
    ? `#${hex
        .slice(0, 3)
        .split("")
        .map((character) => character + character)
        .join("")}`
    : `#${hex.slice(0, 6)}`;
}
export function avatarPalette(config = {}) {
  const settings = record(config) ? config : {};
  return {
    skin: color(settings.skin, skinColors, skinColors.peach),
    hair: color(settings.hair, hairColors, hairColors.ink),
    outfit: color(settings.outfit, outfitColors, outfitColors.sage),
    eyes: color(settings.eyes, eyeColors, eyeColors.hazel),
  };
}
function tint(hex, target, amount) {
  const rgb = (value) =>
    [1, 3, 5].map((index) =>
      Number.parseInt(value.slice(index, index + 2), 16),
    );
  const first = rgb(hex),
    second = rgb(target);
  return `#${first
    .map((channel, index) =>
      Math.round(channel + (second[index] - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function normalize(config, user) {
  const settings = record(config)
    ? config
    : record(user?.avatar)
      ? user.avatar
      : {};
  const aliases = {
    wave: "waves",
    long: "bob",
    short: "crop",
    fade: "crop",
    afro: "curls",
    bun: "braids",
  };
  const style =
    typeof settings.hairStyle === "string"
      ? aliases[settings.hairStyle] || settings.hairStyle
      : "waves";
  return {
    ...avatarPalette(settings),
    hairStyle: ["waves", "bob", "curls", "crop", "braids"].includes(style)
      ? style
      : "waves",
    accessory: [
      "none",
      "glasses",
      "round-glasses",
      "earrings",
      "headphones",
      "cap",
      "beanie",
    ].includes(settings.accessory)
      ? settings.accessory
      : "none",
    outfitStyle: avatarStyles.outfitStyle.some(
      (item) => item.id === settings.outfitStyle,
    )
      ? settings.outfitStyle
      : "jacket",
    expression: avatarStyles.expression.some(
      (item) => item.id === settings.expression,
    )
      ? settings.expression
      : "smile",
  };
}
function Definitions({ uid, look, portrait = false }) {
  const id = (name) => `${uid}-${name}`;
  return (
    <defs>
      <radialGradient id={id("skin")} cx="33%" cy="25%" r="81%">
        <stop offset="0" stopColor={tint(look.skin, "#fff0dd", 0.38)} />
        <stop offset=".51" stopColor={look.skin} />
        <stop offset="1" stopColor={tint(look.skin, "#704334", 0.25)} />
      </radialGradient>
      <linearGradient id={id("neck")} x1="0" y1="0" x2=".7" y2="1">
        <stop stopColor={tint(look.skin, "#543b32", 0.38)} />
        <stop offset=".6" stopColor={look.skin} />
        <stop offset="1" stopColor={tint(look.skin, "#ffead5", 0.14)} />
      </linearGradient>
      <linearGradient id={id("hair")} x1=".1" y1="0" x2=".85" y2="1">
        <stop stopColor={tint(look.hair, "#ffe7cc", 0.2)} />
        <stop offset=".43" stopColor={look.hair} />
        <stop offset="1" stopColor={tint(look.hair, "#151822", 0.42)} />
      </linearGradient>
      <linearGradient id={id("hair-back")} x1="0" y1="0" x2="1" y2="0">
        <stop stopColor={tint(look.hair, "#181c27", 0.3)} />
        <stop offset=".4" stopColor={look.hair} />
        <stop offset="1" stopColor={tint(look.hair, "#101521", 0.44)} />
      </linearGradient>
      <linearGradient id={id("hair-shine")} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={tint(look.hair, "#fff1cf", 0.57)} stopOpacity=".55" />
        <stop offset="1" stopColor={look.hair} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={id("outfit")} x1=".1" y1="0" x2=".95" y2=".8">
        <stop stopColor={tint(look.outfit, "#fff0d9", 0.3)} />
        <stop offset=".45" stopColor={look.outfit} />
        <stop offset="1" stopColor={tint(look.outfit, "#273348", 0.36)} />
      </linearGradient>
      <linearGradient id={id("sleeve")} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={look.outfit} />
        <stop offset="1" stopColor={tint(look.outfit, "#1e2b3f", 0.3)} />
      </linearGradient>
      <linearGradient id={id("iris")} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={tint(look.eyes, "#182433", 0.52)} />
        <stop offset=".62" stopColor={look.eyes} />
        <stop offset="1" stopColor={tint(look.eyes, "#e9db9e", 0.38)} />
      </linearGradient>
      <linearGradient id={id("white")} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#fffefa" />
        <stop offset="1" stopColor="#d9dce0" />
      </linearGradient>
      <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff0b6" />
        <stop offset=".35" stopColor="#e0b961" />
        <stop offset=".72" stopColor="#b78540" />
        <stop offset="1" stopColor="#fae5a4" />
      </linearGradient>
      <linearGradient id={id("pants")} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#59616e" />
        <stop offset=".48" stopColor="#414b5b" />
        <stop offset="1" stopColor="#283443" />
      </linearGradient>
      <radialGradient id={id("blush")}>
        <stop stopColor="#d87470" stopOpacity=".45" />
        <stop offset="1" stopColor="#d87470" stopOpacity="0" />
      </radialGradient>
      {portrait && (
        <>
          <radialGradient id={id("backdrop")} cx="29%" cy="20%" r="95%">
            <stop stopColor={tint(look.outfit, "#fff9ef", 0.9)} />
            <stop offset="1" stopColor={tint(look.outfit, "#dfdfd3", 0.7)} />
          </radialGradient>
          <clipPath id={id("clip")}>
            <circle cx="80" cy="80" r="79" />
          </clipPath>
        </>
      )}
    </defs>
  );
}
function Clothing({ look, uid, figure = false }) {
  const fill = (name) => `url(#${uid}-${name})`;
  const shadow = tint(look.outfit, "#182b3c", 0.31),
    light = tint(look.outfit, "#fff4e0", 0.58);
  return (
    <g>
      <path
        d="M53 122C34 124 25 137 21 155L14 180Q10 192 23 196Q35 199 40 185L51 154M107 122C125 128 136 141 139 159L147 184Q149 195 136 198Q124 198 120 185L109 153"
        fill={fill("sleeve")}
      />
      {figure && (
        <>
          <path
            d="M16 190Q10 195 15 207Q19 215 25 211L30 201Q35 205 38 199L29 189Z"
            fill={fill("skin")}
          />
          <path
            d="M134 191L126 199Q128 205 133 202L139 213Q147 214 150 205Q154 195 145 191Z"
            fill={fill("skin")}
          />
          <path
            d="M17 207L21 201M144 208L140 201"
            fill="none"
            stroke={tint(look.skin, "#63392f", 0.35)}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d="M55 119Q80 113 105 119Q122 128 125 151L119 205Q80 216 40 205L35 152Q38 131 55 119Z"
        fill={fill("outfit")}
      />
      <path
        d="M40 142Q44 130 54 126M119 143Q116 132 108 128"
        stroke={light}
        strokeOpacity=".42"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M40 151L45 204M119 151L115 205"
        stroke={shadow}
        strokeOpacity=".33"
        strokeWidth="2.5"
        fill="none"
      />
      {look.outfitStyle === "jacket" && (
        <>
          <path
            d="M64 121L80 135L96 121L101 151H59Z"
            fill={tint(look.outfit, "#fcf3df", 0.79)}
          />
          <path
            d="M55 119L67 116Q72 127 80 130Q89 126 94 116L107 119L99 139L81 135L61 141Z"
            fill={shadow}
          />
          <path
            d="M61 120L66 118Q71 129 80 132Q90 128 95 118L101 120"
            stroke={light}
            strokeOpacity=".5"
            strokeWidth="1.8"
            fill="none"
          />
          <path
            d="M80 135V209"
            stroke={tint(look.outfit, "#253040", 0.52)}
            strokeWidth="3"
          />
          <path d="M81 137V208" stroke="#e8d5b6" strokeWidth=".8" />
          <rect
            x="76.5"
            y="145"
            width="7"
            height="11"
            rx="2"
            fill={fill("gold")}
          />
          <path
            d="M57 166L50 184M103 166L110 184"
            stroke={shadow}
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M40 201Q79 212 119 201L119 210Q80 220 40 210Z"
            fill={shadow}
          />
          <path
            d="M101 148L109 148L111 157L99 157Z"
            fill={light}
            opacity=".75"
          />
          <path
            d="M103 152L107 152"
            stroke={shadow}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      )}
      {look.outfitStyle === "hoodie" && (
        <>
          <path
            d="M54 119Q80 104 107 119L111 140Q94 144 80 131Q66 144 50 140Z"
            fill={shadow}
          />
          <path
            d="M59 118Q79 127 101 118L102 127Q89 137 80 131Q70 139 57 130Z"
            fill={fill("outfit")}
          />
          <path
            d="M65 132L64 157M96 132L97 157"
            fill="none"
            stroke="#f2e5ce"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="62"
            y="155"
            width="4"
            height="7"
            rx="1.5"
            fill={fill("gold")}
          />
          <rect
            x="95"
            y="155"
            width="4"
            height="7"
            rx="1.5"
            fill={fill("gold")}
          />
          <path
            d="M61 174L52 193Q80 201 108 193L99 174Z"
            fill={shadow}
            opacity=".3"
          />
          <path
            d="M64 175H97M53 191Q80 198 107 191"
            fill="none"
            stroke={light}
            strokeWidth="1.3"
            strokeOpacity=".55"
          />
          <path
            d="M41 204Q80 215 119 204"
            fill="none"
            stroke={shadow}
            strokeWidth="7"
          />
        </>
      )}
      {look.outfitStyle === "tee" && (
        <>
          <path
            d="M58 119Q80 134 102 119"
            fill="none"
            stroke={shadow}
            strokeWidth="8"
          />
          <path
            d="M61 118Q80 132 99 118"
            fill="none"
            stroke={light}
            strokeOpacity=".65"
            strokeWidth="2.4"
          />
          <path
            d="M19 170L40 176M122 177L143 172"
            fill="none"
            stroke={shadow}
            strokeWidth="4"
          />
          <circle cx="103" cy="153" r="7" fill={light} opacity=".6" />
          <path
            d="M99 155L103 149L107 155M100 153H106"
            fill="none"
            stroke={shadow}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M43 206Q79 215 116 206"
            stroke={light}
            strokeOpacity=".35"
            fill="none"
            strokeWidth="1.4"
          />
        </>
      )}
      {look.outfitStyle === "knit" && (
        <>
          <path
            d="M61 114Q80 121 99 114L100 130Q81 137 59 130Z"
            fill={fill("outfit")}
          />
          {[64, 70, 76, 82, 88, 94].map((x) => (
            <path
              key={x}
              d={`M${x} 119V130`}
              stroke={shadow}
              strokeOpacity=".35"
              strokeWidth="1.4"
            />
          ))}
          {[51, 60, 69, 78, 87, 96, 105, 114].map((x) => (
            <path
              key={x}
              d={`M${x} 143L${x + (80 - x) * 0.09} 207`}
              stroke={light}
              strokeOpacity=".17"
              strokeWidth="1.6"
            />
          ))}
          {[149, 160, 172, 184, 196].map((y) => (
            <path
              key={y}
              d={`M45 ${y}Q80 ${y + 6} 116 ${y}`}
              stroke={shadow}
              strokeOpacity=".08"
              strokeWidth="2"
              fill="none"
            />
          ))}
          <path
            d="M15 184L36 190M125 190L146 185"
            fill="none"
            stroke={shadow}
            strokeWidth="6"
          />
        </>
      )}
    </g>
  );
}
function BackHair({ look, uid }) {
  const fill = (name) => `url(#${uid}-${name})`;
  if (look.hairStyle === "bob")
    return (
      <g>
        <path
          d="M40 59Q34 23 79 21Q125 22 122 66L125 125Q105 136 89 119L66 121Q47 138 34 124Z"
          fill={fill("hair-back")}
        />
        <path
          d="M42 71Q36 104 41 124M115 67Q121 99 116 125"
          fill="none"
          stroke={fill("hair-shine")}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    );
  if (look.hairStyle === "braids")
    return (
      <g fill={fill("hair-back")}>
        <path d="M44 61Q30 31 67 23Q111 12 122 44L122 79L112 119H48L37 80Z" />
        <path
          d="M42 65L39 127M119 64L123 128"
          fill="none"
          stroke={tint(look.hair, "#131725", 0.2)}
          strokeWidth="17"
          strokeLinecap="round"
        />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={i}>
            <ellipse
              cx={40 + (i % 2 ? 2 : -1)}
              cy={69 + i * 9}
              rx="8"
              ry="7"
              fill={fill("hair")}
            />
            <ellipse
              cx={122 + (i % 2 ? -2 : 1)}
              cy={68 + i * 9}
              rx="8"
              ry="7"
              fill={fill("hair")}
            />
            <path
              d={`M${37 + (i % 2 ? 2 : -1)} ${66 + i * 9}L${43 + (i % 2 ? 2 : -1)} ${71 + i * 9}M${119 + (i % 2 ? -2 : 1)} ${65 + i * 9}L${125 + (i % 2 ? -2 : 1)} ${70 + i * 9}`}
              stroke={fill("hair-shine")}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path
          d="M34 128L46 128M116 127L128 127"
          stroke={look.outfit}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  return null;
}
function FrontHair({ look, uid }) {
  const fill = (name) => `url(#${uid}-${name})`;
  if (look.hairStyle === "waves")
    return (
      <g>
        <path
          d="M43 69Q33 60 37 43Q36 25 54 22Q66 7 87 14Q119 14 124 41Q125 59 115 69L110 48Q98 55 87 39Q72 52 64 38Q58 55 47 54Z"
          fill={fill("hair")}
        />
        <path
          d="M47 42Q45 28 62 27Q76 17 87 21Q107 20 115 36Q98 29 83 33Q64 24 47 42Z"
          fill={fill("hair-shine")}
        />
        <path
          d="M52 29Q60 21 73 22M77 18Q96 16 107 26M48 45Q58 46 67 35M83 35Q93 43 104 43"
          fill="none"
          stroke={tint(look.hair, "#fbdfb8", 0.35)}
          strokeOpacity=".45"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M41 49L44 68M118 49L115 65"
          stroke={tint(look.hair, "#151925", 0.37)}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  if (look.hairStyle === "crop")
    return (
      <g>
        <path
          d="M43 68L42 44Q44 22 73 21Q102 16 116 34L118 62L112 69L108 44Q85 53 57 42L50 50L48 69Z"
          fill={fill("hair")}
        />
        <path
          d="M46 49L48 63M114 43L114 63"
          stroke={tint(look.hair, look.skin, 0.5)}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M48 39Q56 26 79 28Q98 21 110 34Q81 43 48 39Z"
          fill={fill("hair-shine")}
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${53 + i * 11} 34Q${59 + i * 9} 26 ${67 + i * 8} 26`}
            fill="none"
            stroke={tint(look.hair, "#edd3b4", 0.42)}
            strokeOpacity=".4"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
        <path
          d="M48 56L48 60M114 52L114 56"
          stroke={tint(look.hair, "#191d2a", 0.45)}
          strokeWidth="1.4"
        />
      </g>
    );
  if (look.hairStyle === "bob")
    return (
      <g>
        <path
          d="M39 70Q32 32 57 24Q96 11 114 34Q126 45 121 76L115 91L107 80L110 55Q98 49 88 35Q76 48 61 51L51 70L48 98L39 88Z"
          fill={fill("hair")}
        />
        <path
          d="M43 59Q42 31 69 29Q58 43 51 62L46 99L42 85Z"
          fill={fill("hair-shine")}
        />
        <path
          d="M89 29Q107 37 114 56L117 89M49 53Q54 34 70 29"
          fill="none"
          stroke={tint(look.hair, "#f9d5ba", 0.4)}
          strokeOpacity=".45"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M82 27L86 34"
          fill="none"
          stroke={tint(look.skin, "#f7dbc6", 0.5)}
          strokeOpacity=".5"
          strokeWidth="1.5"
        />
      </g>
    );
  if (look.hairStyle === "curls")
    return (
      <g>
        <path
          d="M39 69Q26 36 52 23Q60 9 83 14Q110 10 123 37Q134 55 118 69L108 56Q85 63 64 51L52 65Z"
          fill={fill("hair-back")}
        />
        {[
          [43, 50, 12],
          [44, 36, 13],
          [57, 27, 14],
          [73, 22, 14],
          [89, 23, 14],
          [107, 30, 14],
          [119, 44, 12],
          [119, 58, 9],
          [54, 48, 11],
          [70, 40, 13],
          [87, 40, 12],
          [105, 46, 11],
          [38, 65, 7],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={fill("hair")} />
            <path
              d={`M${x - r * 0.4} ${y + r * 0.1}Q${x - r * 0.55} ${y - r * 0.6} ${x + r * 0.35} ${y - r * 0.5}`}
              fill="none"
              stroke={tint(look.hair, "#fde2ba", 0.42)}
              strokeOpacity=".36"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    );
  return (
    <g>
      <path
        d="M42 67Q31 34 59 23Q88 13 111 28Q126 40 119 66L111 62Q100 43 81 32Q64 54 49 65Z"
        fill={fill("hair")}
      />
      <path
        d="M79 27Q66 32 45 51M84 27Q100 34 116 50M71 30Q61 35 49 44M94 31Q105 39 113 43"
        fill="none"
        stroke={tint(look.hair, "#efcaac", 0.42)}
        strokeOpacity=".45"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M80 25L81 32"
        stroke={tint(look.skin, "#e9c5a9", 0.4)}
        strokeOpacity=".65"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  );
}
function Eyes({ look, uid }) {
  const fill = (name) => `url(#${uid}-${name})`;
  const calm = look.expression === "calm";
  return (
    <g>
      {[63, 98].map((x, i) => (
        <g key={x}>
          {look.expression === "wink" && i === 0 ? (
            <>
              <path
                d="M53 77Q63 70 73 77"
                fill="none"
                stroke="#343440"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M53 79L51 76"
                stroke="#343440"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <path
                d={`M${x - 11} 77Q${x} ${calm ? 70 : 66} ${x + 11} 77Q${x + 8} 85 ${x} 85Q${x - 8} 85 ${x - 11} 77Z`}
                fill={fill("white")}
              />
              <ellipse
                cx={x + 0.7}
                cy="77.5"
                rx="5.3"
                ry={calm ? 5.2 : 6.7}
                fill={fill("iris")}
              />
              <ellipse
                cx={x + 0.9}
                cy="78"
                rx="2.55"
                ry={calm ? 3.8 : 4.8}
                fill="#252735"
              />
              <circle cx={x - 0.8} cy="74.3" r="1.85" fill="#fffdf4" />
              <circle cx={x + 2.8} cy="79.5" r=".9" fill="#fff" opacity=".72" />
              <path
                d={`M${x - 11} 77Q${x} ${calm ? 70 : 66} ${x + 11} 77`}
                fill="none"
                stroke="#3c353a"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d={`M${x - 7} 84Q${x} 86 ${x + 7} 83`}
                fill="none"
                stroke={tint(look.skin, "#774e43", 0.34)}
                strokeOpacity=".5"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </>
          )}
        </g>
      ))}
    </g>
  );
}
function Accessories({ look, uid }) {
  const fill = (name) => `url(#${uid}-${name})`;
  if (look.accessory === "glasses" || look.accessory === "round-glasses")
    return (
      <g>
        <circle
          cx="63"
          cy="77"
          r="13"
          fill="#e4f1f4"
          fillOpacity=".08"
          stroke="#51464b"
          strokeWidth="2.5"
        />
        <circle
          cx="98"
          cy="77"
          r="13"
          fill="#e4f1f4"
          fillOpacity=".08"
          stroke="#51464b"
          strokeWidth="2.5"
        />
        <path
          d="M76 75Q81 71 85 75M50 74L44 72M111 74L118 71"
          fill="none"
          stroke="#51464b"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M55 71L61 67M90 72L96 68"
          stroke="#fffef7"
          strokeWidth="2"
          strokeOpacity=".6"
          strokeLinecap="round"
        />
      </g>
    );
  if (look.accessory === "earrings")
    return (
      <g fill="none" stroke={fill("gold")} strokeWidth="3.3">
        <ellipse cx="43" cy="95" rx="5.8" ry="8.2" />
        <ellipse cx="118" cy="95" rx="5.8" ry="8.2" />
        <path
          d="M40 86L42 88M117 86L119 88"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  if (look.accessory === "headphones")
    return (
      <g>
        <path
          d="M34 77V51Q34 17 80 17Q128 17 128 51V77"
          fill="none"
          stroke="#404b58"
          strokeWidth="8"
        />
        <path
          d="M35 59V49Q37 21 80 21Q124 21 127 49V59"
          fill="none"
          stroke="#e3e5dd"
          strokeWidth="4"
        />
        <rect x="31" y="70" width="17" height="31" rx="8" fill="#354350" />
        <rect x="114" y="70" width="17" height="31" rx="8" fill="#354350" />
        <rect
          x="32"
          y="72"
          width="9"
          height="26"
          rx="4.5"
          fill={fill("outfit")}
        />
        <rect
          x="121"
          y="73"
          width="8"
          height="25"
          rx="4"
          fill={fill("outfit")}
        />
        <path
          d="M35 78V89M125 79V90"
          stroke="#e4e7df"
          strokeOpacity=".5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    );
  if (look.accessory === "cap")
    return (
      <g>
        <path
          d="M39 53Q43 19 80 19Q115 20 122 54L112 63L42 63Z"
          fill={fill("outfit")}
        />
        <path
          d="M77 22Q65 35 67 53M85 22Q97 36 99 51"
          fill="none"
          stroke={tint(look.outfit, "#faf0d9", 0.48)}
          strokeOpacity=".52"
          strokeWidth="1.5"
        />
        <path
          d="M39 53Q75 45 119 52Q131 51 142 61Q126 74 98 66L43 61Z"
          fill={tint(look.outfit, "#334252", 0.32)}
        />
        <path
          d="M41 54Q81 49 119 54"
          fill="none"
          stroke={tint(look.outfit, "#ffedd3", 0.35)}
          strokeWidth="2.3"
          strokeOpacity=".65"
        />
        <path d="M80 34L84 40L80 46L76 40Z" fill="#eee0bd" opacity=".8" />
        <ellipse
          cx="81"
          cy="21"
          rx="5"
          ry="2.5"
          fill={tint(look.outfit, "#253946", 0.3)}
        />
      </g>
    );
  if (look.accessory === "beanie")
    return (
      <g>
        <path
          d="M37 55Q32 18 78 16Q120 13 125 55L116 62H42Z"
          fill={fill("outfit")}
        />
        {[48, 61, 74, 87, 100, 113].map((x) => (
          <path
            key={x}
            d={`M${x} 29L${x + (80 - x) * 0.11} 54`}
            stroke={tint(look.outfit, "#ffedd2", 0.55)}
            strokeOpacity=".38"
            strokeWidth="2"
          />
        ))}
        <path
          d="M37 52Q81 42 124 53L124 65Q79 55 38 66Z"
          fill={tint(look.outfit, "#37435a", 0.2)}
        />
        <rect x="101" y="55" width="11" height="10" rx="2" fill="#efdeba" />
        <path d="M104 59L108 62" stroke={look.outfit} strokeWidth="1.8" />
      </g>
    );
  return null;
}
function Character({ look, uid, figure = false }) {
  const fill = (name) => `url(#${uid}-${name})`;
  const brow = tint(look.hair, "#29232b", 0.25);
  return (
    <g>
      <BackHair look={look} uid={uid} />
      <Clothing look={look} uid={uid} figure={figure} />
      <path
        d="M65 104L64 120Q64 132 80 137Q97 131 97 120L96 104Z"
        fill={fill("neck")}
      />
      <path
        d="M66 114Q81 124 95 113L95 119Q80 133 65 121Z"
        fill={tint(look.skin, "#633f35", 0.36)}
        opacity=".25"
      />
      <ellipse cx="45" cy="80" rx="8" ry="12" fill={fill("skin")} />
      <ellipse cx="116" cy="80" rx="8" ry="12" fill={fill("skin")} />
      <path
        d="M44 75Q39 79 45 85M117 75Q122 79 116 86"
        fill="none"
        stroke={tint(look.skin, "#6a4039", 0.39)}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity=".75"
      />
      <path
        d="M48 58Q48 33 80 32Q114 32 114 59L112 86Q109 105 94 115Q81 124 67 115Q50 105 47 85Z"
        fill={tint(look.skin, "#734837", 0.2)}
      />
      <path
        d="M48 56Q50 34 80 33Q111 33 113 57L110 85Q107 103 94 112Q81 120 68 111Q52 102 49 84Z"
        fill={fill("skin")}
      />
      <path
        d="M53 65Q52 43 74 39"
        fill="none"
        stroke="#fff4de"
        strokeOpacity=".16"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="59" cy="93" rx="13" ry="8" fill={fill("blush")} />
      <ellipse cx="102" cy="93" rx="13" ry="8" fill={fill("blush")} />
      <FrontHair look={look} uid={uid} />
      <path
        d={
          look.expression === "calm"
            ? "M54 65Q63 62 72 65M88 65Q98 62 107 65"
            : look.expression === "wink"
              ? "M54 65Q63 59 72 64M89 63Q98 60 107 65"
              : "M54 65Q63 60 72 64M89 64Q98 60 107 65"
        }
        fill="none"
        stroke={brow}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <Eyes look={look} uid={uid} />
      <path
        d="M80 79Q81 84 77 88Q75 92 81 93Q86 94 88 90"
        fill={tint(look.skin, "#935f49", 0.29)}
        fillOpacity=".6"
      />
      <path
        d="M78 88Q82 91 85 89"
        fill="none"
        stroke={tint(look.skin, "#fff0d5", 0.5)}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M78 94Q81 95 85 93"
        fill="none"
        stroke={tint(look.skin, "#673f35", 0.4)}
        strokeOpacity=".42"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {look.expression === "grin" ? (
        <g>
          <path
            d="M67 100Q80 106 94 99Q92 114 81 115Q69 113 67 100Z"
            fill="#703f43"
          />
          <path
            d="M69 101Q81 106 92 101L89 106Q80 110 72 105Z"
            fill={fill("white")}
          />
          <path d="M76 112Q83 106 89 111Q82 116 76 112Z" fill="#df8b8a" />
        </g>
      ) : look.expression === "calm" ? (
        <path
          d="M71 103Q81 107 91 102"
          stroke="#8e5952"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <g>
          <path
            d="M70 102Q81 108 92 101Q89 111 81 111Q73 110 70 102Z"
            fill="#905149"
          />
          <path
            d="M73 103Q81 107 89 103L87 106Q81 108 75 105Z"
            fill="#fff5e7"
          />
          <path
            d="M74 112Q81 115 87 111"
            fill="none"
            stroke={tint(look.skin, "#fff0d4", 0.45)}
            strokeOpacity=".46"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      )}
      {look.expression === "grin" && (
        <g fill={tint(look.skin, "#7e4236", 0.4)} opacity=".55">
          <circle cx="56" cy="90" r=".8" />
          <circle cx="61" cy="91" r=".7" />
          <circle cx="65" cy="90" r=".8" />
          <circle cx="98" cy="90" r=".8" />
          <circle cx="103" cy="92" r=".7" />
        </g>
      )}
      <Accessories look={look} uid={uid} />
    </g>
  );
}
function safeDimension(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, 2048)
    : fallback;
}
function useAvatarId() {
  return `rv-character-${useId().replace(/[^a-z0-9_-]/gi, "")}`;
}

export default function Avatar({ user, config, size = 40, className = "" }) {
  const look = normalize(config, user);
  const uid = useAvatarId();
  const label =
    typeof user?.name === "string" && user.name
      ? `${user.name} avatar`
      : "Your avatar";
  const dimension = safeDimension(size, 40);
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 160 160"
      className={`avatar portrait-avatar ${typeof className === "string" ? className : ""}`}
      role="img"
      aria-label={label}
    >
      <Definitions uid={uid} look={look} portrait />
      <g clipPath={`url(#${uid}-clip)`}>
        <circle cx="80" cy="80" r="80" fill={`url(#${uid}-backdrop)`} />
        <circle cx="111" cy="46" r="54" fill="#fff9e7" opacity=".25" />
        <circle cx="24" cy="130" r="41" fill={look.outfit} opacity=".12" />
        <ellipse
          cx="80"
          cy="158"
          rx="61"
          ry="12"
          fill={tint(look.outfit, "#253a43", 0.5)}
          opacity=".12"
        />
        <Character look={look} uid={uid} />
      </g>
      <circle
        cx="80"
        cy="80"
        r="78.6"
        fill="none"
        stroke="#fff9ee"
        strokeWidth="1.8"
        strokeOpacity=".7"
      />
    </svg>
  );
}

/** A transparent full-body character for the 2D room. Uses exactly the same
 * saved face, hairstyle, clothing, expression, and accessory as the portrait. */
export function AvatarFigure({
  user,
  config,
  width = 100,
  height = 180,
  className = "",
}) {
  const look = normalize(config, user);
  const uid = useAvatarId();
  const label =
    typeof user?.name === "string" && user.name
      ? `${user.name} room character`
      : "Your room character";
  return (
    <svg
      width={safeDimension(width, 100)}
      height={safeDimension(height, 180)}
      viewBox="0 0 100 180"
      className={`avatar-figure ${typeof className === "string" ? className : ""}`}
      role="img"
      aria-label={label}
    >
      <Definitions uid={uid} look={look} />
      <ellipse cx="50" cy="174" rx="27" ry="4" fill="#33443d" opacity=".15" />
      <path
        d="M30 99Q48 95 69 100L65 140L62 167L48 167L49 139L45 121L42 144L41 167H27L27 140Z"
        fill={`url(#${uid}-pants)`}
      />
      <path
        d="M47 111L50 119L52 145M33 113L31 144"
        stroke="#71808d"
        strokeOpacity=".4"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M28 163L41 163L43 172Q32 178 20 172L21 169Z"
        fill={`url(#${uid}-white)`}
      />
      <path
        d="M49 163L62 163L73 169L74 174Q62 178 47 172Z"
        fill={`url(#${uid}-white)`}
      />
      <path
        d="M22 172Q31 176 42 172M49 173Q61 177 72 173"
        fill="none"
        stroke="#9aa6ac"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M28 168L34 168M52 168L58 169"
        stroke={look.outfit}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(8 -3) scale(.52)">
        <Character look={look} uid={uid} figure />
      </g>
    </svg>
  );
}
