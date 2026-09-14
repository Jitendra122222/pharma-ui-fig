import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "ghost"
  | "outline"
  | "danger"
  | "ghost-danger"
  | "icon";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: "Inter",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  outline: "none",
  lineHeight: 1,
  userSelect: "none",
};

const SIZE: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 14px", fontSize: 12 },
  md: { padding: "9px 18px", fontSize: 13 },
  lg: { padding: "10px 18px", fontSize: 13, minHeight: 40 },
};

const VARIANT: Record<ButtonVariant, React.CSSProperties> = {
  primary:        { background: "#1B6CA8", color: "#fff",    border: "none" },
  ghost:          { background: "#fff",    color: "#1A2436", border: "1px solid #E8ECF4" },
  outline:        { background: "#EFF6FF", color: "#1B6CA8", border: "1px solid #1B6CA8" },
  danger:         { background: "#C62828", color: "#fff",    border: "none" },
  "ghost-danger": { background: "#fff",    color: "#C62828", border: "1px solid #E8ECF4" },
  icon:           { background: "transparent", color: "#9CA3AF", border: "none", padding: "4px", fontWeight: 400 },
};

const HOVER: Record<ButtonVariant, React.CSSProperties> = {
  primary:        { background: "#155A8A" },
  ghost:          { background: "#F8FAFC" },
  outline:        { background: "#DBEAFE" },
  danger:         { background: "#B71C1C" },
  "ghost-danger": { background: "#FFEBEE" },
  icon:           { color: "#6B7280" },
};

const DISABLED: React.CSSProperties = {
  opacity: 0.45,
  cursor: "not-allowed",
  pointerEvents: "none",
};

export default function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const iconSize = size === "sm" ? 14 : 16;

  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...BASE,
        ...SIZE[size],
        ...VARIANT[variant],
        ...(hovered && !disabled ? HOVER[variant] : {}),
        ...(disabled ? DISABLED : {}),
        ...(fullWidth ? { width: "100%" } : {}),
        ...style,
      }}
      onMouseEnter={e => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={e => { setHovered(false); onMouseLeave?.(e); }}
    >
      {leftIcon && (
        <span style={{ display: "flex", alignItems: "center", fontSize: iconSize }}>
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span style={{ display: "flex", alignItems: "center", fontSize: iconSize }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
}
