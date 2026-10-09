import React, { useId } from "react";

const skinColors = {
  porcelain: "#f4d7c6",
  peach: "#e9b898",
  honey: "#c58e67",
  bronze: "#a96f4b",
  cocoa: "#764b36",
  espresso: "#493127",
};
const hairColors = {
  ink: "#302b2b",
  brown: "#684b3c",
  auburn: "#9c553c",
  blonde: "#dfbc75",
  silver: "#d8d9ce",
  rose: "#c16c74",
  blue: "#486a89",
};
const outfitColors = {
  coral: "#d8785d",
  sage: "#81a18b",
  cream: "#e5d9bf",
  blue: "#7694ad",
  plum: "#88708c",
  mustard: "#d3aa5a",
  black: "#3e4542",
};
export const avatarOptions = {
  skin: skinColors,
  hair: hairColors,
  outfit: outfitColors,
};
export function avatarPalette(config = {}) {
  return {
    skin:
      skinColors[config.skin] ||
      (config.skin?.startsWith("#") ? config.skin : skinColors.peach),
    hair:
      hairColors[config.hair] ||
      (config.hair?.startsWith("#") ? config.hair : hairColors.ink),
    outfit:
      outfitColors[config.outfit] ||
      (config.outfit?.startsWith("#") ? config.outfit : outfitColors.sage),
  };
}

export default function Avatar({ user, config, size = 40, className = "" }) {
  const settings = config || user?.avatar || {};
  const { skin, hair, outfit } = avatarPalette(settings);
  const uid = useId().replace(/:/g, "");
  const style =
    {
      waves: "wave",
      long: "bob",
      short: "crop",
      fade: "crop",
      afro: "curls",
      bun: "braids",
    }[settings.hairStyle] ||
    settings.hairStyle ||
    "wave";
  const accessory = settings.accessory || "none";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`avatar portrait-avatar ${className}`}
      role="img"
      aria-label={`${user?.name || "Your"} avatar`}
    >
      <defs>
        <clipPath id={uid}>
          <circle cx="50" cy="50" r="49" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <rect width="100" height="100" fill="#eee6d9" />
        <circle cx="75" cy="27" r="21" fill="#d8e0d3" />
        <circle cx="15" cy="85" r="33" fill="#e8c2ad" />
        {(style === "bob" || style === "braids") && (
          <path
            d="M25 45Q21 19 49 18Q80 17 76 49L79 72Q65 83 51 69Q39 82 22 70Z"
            fill={hair}
          />
        )}
        <path d="M13 102V89Q15 73 35 71L65 71Q87 74 89 92V102Z" fill={outfit} />
        <path d="M41 64V75Q49 85 59 75V63" fill={skin} />
        <path
          d="M36 72L49 82L39 87L31 74M63 72L50 82L61 87L70 74"
          fill="#ffffff"
          opacity=".32"
        />
        <ellipse cx="28" cy="47" rx="5" ry="7" fill={skin} />
        <ellipse cx="72" cy="47" rx="5" ry="7" fill={skin} />
        <path
          d="M28 35Q28 20 50 20Q72 20 72 36V51Q70 70 51 73Q29 69 28 51Z"
          fill={skin}
        />
        {style === "wave" && (
          <path
            d="M27 46Q19 25 34 21Q55 7 72 24Q80 31 73 45L65 35Q52 39 48 26Q37 40 27 37Z"
            fill={hair}
          />
        )}
        {style === "crop" && (
          <path
            d="M27 40L27 28Q39 11 61 20Q79 22 73 42L67 31Q47 38 32 30L32 40Z"
            fill={hair}
          />
        )}
        {style === "bob" && (
          <path
            d="M25 41Q23 16 50 17Q77 16 75 45L66 39L61 29Q50 38 30 35L30 49Z"
            fill={hair}
          />
        )}
        {style === "curls" && (
          <g fill={hair}>
            <circle cx="29" cy="33" r="10" />
            <circle cx="33" cy="23" r="10" />
            <circle cx="46" cy="19" r="11" />
            <circle cx="60" cy="20" r="11" />
            <circle cx="71" cy="29" r="10" />
            <circle cx="74" cy="39" r="7" />
            <circle cx="25" cy="43" r="7" />
          </g>
        )}
        {style === "braids" && (
          <g fill={hair}>
            <path d="M25 35Q25 15 50 16Q76 16 75 35L70 41Q59 32 49 26Q43 34 28 40Z" />
            <path d="M23 36Q17 60 27 76L34 71Q27 53 30 37M72 37Q79 56 70 78L63 72Q70 52 67 36" />
          </g>
        )}
        <path
          d="M35 45Q40 42 44 45M56 45Q61 42 65 45"
          fill="none"
          stroke={hair}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="40" cy="49" rx="1.8" ry="2.3" fill="#292b2c" />
        <ellipse cx="61" cy="49" rx="1.8" ry="2.3" fill="#292b2c" />
        <path
          d="M50 49L48 56L52 57"
          fill="none"
          stroke="#824f41"
          strokeOpacity=".35"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M43 62Q50 67 58 61"
          fill="none"
          stroke="#8a4a42"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse cx="34" cy="57" rx="4" ry="2" fill="#dc827b" opacity=".28" />
        <ellipse cx="66" cy="57" rx="4" ry="2" fill="#dc827b" opacity=".28" />
        {(accessory === "glasses" || accessory === "round-glasses") && (
          <g fill="none" stroke="#393e3c" strokeWidth="1.7">
            <circle cx="39" cy="49" r="7" />
            <circle cx="62" cy="49" r="7" />
            <path d="M46 48Q51 45 55 48M27 47L32 48M69 48L74 46" />
          </g>
        )}
        {accessory === "earrings" && (
          <g fill="none" stroke="#d7a542" strokeWidth="2">
            <ellipse cx="27" cy="55" rx="3" ry="5" />
            <ellipse cx="73" cy="55" rx="3" ry="5" />
          </g>
        )}
        {accessory === "headphones" && (
          <g fill="none" stroke="#ece8dd" strokeWidth="5">
            <path d="M24 47V35Q26 16 50 16Q75 16 77 36V46" />
            <path
              d="M25 43V54M76 43V54"
              stroke="#596d65"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        )}
        {accessory === "cap" && (
          <g>
            <path d="M24 34Q28 12 49 14Q72 13 76 32Z" fill="#73917c" />
            <path d="M42 31Q61 24 82 33Q76 39 44 36Z" fill="#556c5a" />
          </g>
        )}
        <path
          d="M50 83V101"
          stroke="#ffffff"
          strokeOpacity=".15"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
