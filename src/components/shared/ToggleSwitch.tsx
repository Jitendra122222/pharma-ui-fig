export function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 30,
        height: 16,
        borderRadius: 8,
        border: "none",
        background: checked ? "#1B6CA8" : "#DDE3EC",
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}
