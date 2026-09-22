// Design-system constants — use in inline style={{}} objects.
// These match the @theme tokens in index.css and the hex values in CLAUDE.md.

export const COLORS = {
  // Text
  textPrimary:  "#1A2436",
  textDark:     "#0C1B33",
  textMuted:    "#6B7280",
  textSoft:     "#9CA3AF",

  // Brand
  primary:      "#1B6CA8",
  primaryDark:  "#0F4C7A",
  accent:       "#00ACC1",

  // Borders
  border:       "#DDE3EC",
  borderLight:  "#E8ECF4",
  borderLighter:"#EEF1F6",

  // Backgrounds
  bgPage:       "#F0F3F7",
  bgSurface:    "#F8FAFC",
  bgFaint:      "#FAFBFD",

  // Semantic — success
  success:      "#2E7D32",
  successBg:    "#E8F5E9",
  successBorder:"#A5D6A7",

  // Semantic — warning
  warning:      "#E65100",
  warningBg:    "#FFF3E0",
  warningBorder:"#FFCC80",

  // Semantic — danger
  danger:       "#C62828",
  dangerBg:     "#FFEBEE",
  dangerBorder: "#FFCDD2",

  // Semantic — info
  info:         "#1B6CA8",
  infoBg:       "#EFF6FF",
  infoBorder:   "#BFDBFE",

  // Sidebar
  sidebar:      "#0C1B33",
  sidebarHover: "#162544",
  sidebarActive:"#1B6CA8",
};

export const FONTS = {
  title: "Outfit",
  body:  "Inter",
  mono:  "JetBrains Mono",
};

export const SHADOWS = {
  card:   "0 1px 4px rgba(0,0,0,0.07)",
  panel:  "0 2px 8px rgba(0,0,0,0.10)",
  modal:  "0 12px 40px rgba(0,0,0,0.18)",
};
