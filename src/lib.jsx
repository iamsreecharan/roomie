import React, { useEffect, useRef } from "react";
import { X, Compass } from "lucide-react";
export { default as Avatar } from "./components/Avatar.jsx";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${variant === "primary" ? "" : variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prior = document.activeElement;
    const el = ref.current;
    el?.focus();
    function key(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const a = [
          ...el.querySelectorAll(
            'button,input,textarea,select,a[href],[tabindex="0"]',
          ),
        ].filter((x) => !x.disabled);
        if (!a.length) {
          e.preventDefault();
          return;
        }
        const first = a[0],
          last = a[a.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    document.addEventListener("keydown", key);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = original;
      prior?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Empty({ icon: Icon = Compass, title, children }) {
  return (
    <div className="empty-state">
      <Icon size={32} />
      <h3>{title}</h3>
      <div className="empty-description">{children}</div>
    </div>
  );
}
export function timeAgo(date) {
  const t = Math.max(0, Date.now() - new Date(date).getTime());
  return t < 60000
    ? "Just now"
    : t < 3600000
      ? `${Math.floor(t / 60000)}m ago`
      : t < 86400000
        ? `${Math.floor(t / 3600000)}h ago`
        : `${Math.floor(t / 86400000)}d ago`;
}
export function Art({ variant = "sunset", className = "" }) {
  const palette = {
    sunset: ["#e9bfb0", "#df714b", "#f8d990", "#5e7975"],
    bloom: ["#ece6c5", "#889e7c", "#e98282", "#334a40"],
    tide: ["#c8e0df", "#759fa3", "#e9d5a7", "#245461"],
    orbit: ["#dfd8ed", "#8d86b8", "#e19c75", "#443e64"],
  }[variant] || ["#e9bfb0", "#df714b", "#f8d990", "#5e7975"];
  return (
    <svg
      className={`abstract-art ${className}`}
      viewBox="0 0 400 300"
      role="img"
      aria-label={`${variant} abstract artwork`}
    >
      <rect width="400" height="300" fill={palette[0]} />
      {variant === "bloom" ? (
        <>
          <path
            d="M198 290 Q175 155 240 60 M170 260 Q140 150 86 95"
            fill="none"
            stroke={palette[3]}
            strokeWidth="8"
          />
          <ellipse
            cx="254"
            cy="83"
            rx="38"
            ry="60"
            fill={palette[1]}
            transform="rotate(40 254 83)"
          />
          <ellipse
            cx="91"
            cy="95"
            rx="32"
            ry="50"
            fill={palette[1]}
            transform="rotate(-40 91 95)"
          />
          {[0, 60, 120, 180, 240, 300].map((n) => (
            <ellipse
              key={n}
              cx="198"
              cy="148"
              rx="24"
              ry="51"
              fill={palette[2]}
              transform={`rotate(${n} 198 182)`}
            />
          ))}
          <circle cx="198" cy="182" r="23" fill="#f8dc9a" />
        </>
      ) : variant === "orbit" ? (
        <>
          <circle cx="210" cy="140" r="90" fill={palette[1]} />
          <ellipse
            cx="210"
            cy="155"
            rx="150"
            ry="30"
            fill="none"
            stroke={palette[3]}
            strokeWidth="12"
            transform="rotate(-25 210 155)"
          />
          <circle cx="322" cy="80" r="22" fill={palette[2]} />
          <circle cx="66" cy="217" r="35" fill="#e7d7ac" />
        </>
      ) : (
        <>
          <circle cx="235" cy="104" r="57" fill={palette[2]} />
          <path
            d="M0 180 Q110 120 215 180 T400 175 V300 H0Z"
            fill={palette[1]}
          />
          <path
            d="M0 250 Q105 180 210 245 T400 210 V300 H0Z"
            fill={palette[3]}
          />
          <path
            d="M0 277 Q145 235 280 282 T400 260 V300 H0Z"
            fill={palette[2]}
            opacity=".7"
          />
        </>
      )}
      <rect
        x="15"
        y="15"
        width="370"
        height="270"
        rx="1"
        fill="none"
        stroke="#ffffff"
        opacity=".17"
      />
    </svg>
  );
}
export async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The server could not complete this request.");
  }
  if (!res.ok)
    throw new Error(
      data.error || data.message || "Something went wrong. Please try again.",
    );
  return data;
}
