export function Pip({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="72" rx="18" ry="4" fill="#e6d2bf" />
      <rect x="16" y="14" width="48" height="52" rx="24" fill="#f3a08a" />
      <rect x="16" y="14" width="48" height="24" rx="24" fill="#fffaf1" />
      <circle cx="32" cy="34" r="4" fill="#3b2c27" />
      <circle cx="48" cy="34" r="4" fill="#3b2c27" />
      <path d="M34 44c2.2 3 9.8 3 12 0" stroke="#3b2c27" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="54" cy="40" r="4" fill="#f3d57a" />
    </svg>
  );
}

export function Icon({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 11 12 4l8 7" />
        <path d="M6 10.5V20h12V10.5" />
      </svg>
    );
  }
  if (name === "scan") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
        <rect x="8" y="8" width="8" height="8" rx="2" />
      </svg>
    );
  }
  if (name === "rx") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="5" y="3" width="14" height="18" rx="3" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M5 6h14v10H8l-3 3V6z" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5L6 16z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}
