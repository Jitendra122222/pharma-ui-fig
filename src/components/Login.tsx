import { useState } from "react";

interface LoginProps {
  onLogin: (user: { name: string; role: string; phone: string }) => void;
}

const MOCK_USERS: Record<string, { password: string; name: string; role: string }> = {
  "9999999999": { password: "admin123", name: "Rajesh Kumar", role: "Pharmacist" },
  "9876543210": { password: "pharma123", name: "Priya Sharma", role: "Manager" },
};

const BLUE = "#1B6CA8";
const NAVY = "#0C1B33";
const CYAN = "#17C4E8";

// ── Rx Badge ─────────────────────────────────────────────────────────────────

function RxBadge() {
  return (
    <div style={{
      width: 58, height: 58, background: BLUE, borderRadius: 10, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: "#fff", fontSize: 22, fontWeight: 800, fontFamily: "Outfit" }}>Rx</span>
    </div>
  );
}

// ── Feature icons ─────────────────────────────────────────────────────────────

function BoxIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5"/>
      <circle cx="20" cy="21" r="1.5"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

const FEATURES = [
  { icon: <BoxIcon />,     label: "Inventory\nManagement" },
  { icon: <CartIcon />,    label: "Purchase &\nSales" },
  { icon: <InvoiceIcon />, label: "Invoices &\nReports" },
  { icon: <PeopleIcon />,  label: "Multi-Location\nSupport" },
];

// ── Form icons ────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="12" height="9" rx="2"/>
      <path d="M5 8V6a3 3 0 0 1 6 0v2"/>
    </svg>
  );
}

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="19" height="14" viewBox="0 0 19 14" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 7C1 7 4 1 9.5 1S18 7 18 7 15 13 9.5 13 1 7 1 7Z"/>
      <circle cx="9.5" cy="7" r="2.5"/>
    </svg>
  ) : (
    <svg width="19" height="17" viewBox="0 0 19 17" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l17 15"/>
      <path d="M8 2.6A8.5 8.5 0 0 1 9.5 2.5C15 2.5 18 8 18 8s-.9 1.6-2.5 3"/>
      <path d="M4.3 4.5C2.5 5.8 1 8 1 8s3 5.5 8.5 5.5a8 8 0 0 0 3.7-.9"/>
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="11" height="7" viewBox="0 0 11 7" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l4.5 4.5L10 1"/>
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h12M10 4l5 5-5 5"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Login({ onLogin }: LoginProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone || !password) { setError("Please enter your mobile number and password."); return; }
    setLoading(true);
    setTimeout(() => {
      const user = MOCK_USERS[phone];
      if (user && user.password === password) {
        onLogin({ name: user.name, role: user.role, phone });
      } else {
        setError("Invalid mobile number or password.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden" }}>

      {/* ═══════════════════════ LEFT PANEL ═══════════════════════ */}
      <div style={{ width: "48%", flexShrink: 0, position: "relative", overflow: "hidden" }}>

        {/* Photo background */}
        <img
          src="/bg.png"
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 30%",
            display: "block",
          }}
        />

        {/* Dark gradient overlay — dark at top (text area), reveals photo at bottom */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(165deg, rgba(10,20,50,0.96) 0%, rgba(10,20,50,0.92) 30%, rgba(10,20,50,0.72) 55%, rgba(8,16,44,0.44) 78%, rgba(6,14,38,0.22) 100%)",
        }} />

        {/* Large decorative circle — top-right corner */}
        <div style={{
          position: "absolute",
          right: "-22%", top: "-18%",
          width: "60%", aspectRatio: "1",
          borderRadius: "50%",
          background: "rgba(5,12,32,0.55)",
          zIndex: 1,
        }} />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 2,
          height: "100%",
          display: "flex", flexDirection: "column",
          padding: "44px 52px 48px",
        }}>

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <RxBadge />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>PharmERP</span>
              <span style={{ fontFamily: "Inter", fontSize: 13, color: "rgba(255,255,255,0.52)" }}>City Central Pharmacy</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginTop: 52 }}>
            <h1 style={{
              fontFamily: "Outfit", fontSize: 58, fontWeight: 800,
              color: "#fff", lineHeight: 1.1, letterSpacing: "-0.025em",
              margin: 0,
            }}>
              Complete Pharmacy
              <br />
              <span style={{ color: CYAN }}>Management</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p style={{
            marginTop: 22, fontSize: 15, color: "rgba(255,255,255,0.72)",
            fontFamily: "Inter", lineHeight: 1.65, maxWidth: 400,
          }}>
            Streamline your operations, manage inventory, track sales and grow your pharmacy business — all in one place.
          </p>

          {/* Feature icons */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 0,
            marginTop: 36,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
                {i > 0 && (
                  <div style={{ width: 1, background: "rgba(255,255,255,0.22)", margin: "0 20px", alignSelf: "stretch", minHeight: 52 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", minWidth: 72 }}>
                  {f.icon}
                  <span style={{
                    fontSize: 11, color: "rgba(255,255,255,0.72)",
                    fontFamily: "Inter", fontWeight: 500, lineHeight: 1.4,
                    whiteSpace: "pre-line",
                  }}>
                    {f.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div style={{
        flex: 1,
        background: "#EEF4FF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Decorative + symbols */}
        <div style={{ position: "absolute", top: 38, right: 44, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", userSelect: "none" }}>
          <span style={{ fontSize: 32, color: "rgba(27,108,168,0.16)", fontWeight: 300, lineHeight: 1 }}>+</span>
          <span style={{ fontSize: 26, color: "rgba(27,108,168,0.12)", fontWeight: 300, lineHeight: 1, marginRight: 22 }}>+</span>
        </div>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 530,
          background: "#fff",
          border: "1px solid #D8E4F0",
          borderRadius: 14,
          boxShadow: "0 2px 24px rgba(12,27,51,0.08)",
          padding: "44px 44px 36px",
        }}>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontFamily: "Outfit", fontSize: 34, fontWeight: 800,
              color: NAVY, margin: 0, letterSpacing: "-0.025em", lineHeight: 1.15,
            }}>
              Welcome Back
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 15, color: "#8892A4", fontFamily: "Inter" }}>
              Sign in to your pharmacy workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Mobile Number */}
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#3D4A5C", fontFamily: "Inter", marginBottom: 8 }}>
                Mobile Number
              </label>
              <div style={{
                display: "flex",
                border: `1.5px solid ${phoneFocus ? BLUE : "#D4DCE8"}`,
                borderRadius: 8, overflow: "hidden", background: "#fff",
                boxShadow: phoneFocus ? "0 0 0 3px rgba(27,108,168,0.10)" : "none",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "0 14px", borderRight: "1.5px solid #D4DCE8",
                  background: "#F6F9FC", cursor: "pointer", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, fontFamily: "Inter" }}>+91</span>
                  <ChevronDown />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onFocus={() => setPhoneFocus(true)}
                  onBlur={() => setPhoneFocus(false)}
                  placeholder="Enter your mobile number"
                  style={{
                    flex: 1, border: "none", outline: "none",
                    padding: "13px 14px", fontSize: 14, fontFamily: "Inter",
                    color: NAVY, background: "transparent",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#3D4A5C", fontFamily: "Inter", marginBottom: 8 }}>
                Password
              </label>
              <div style={{
                display: "flex", alignItems: "center",
                border: `1.5px solid ${passFocus ? BLUE : "#D4DCE8"}`,
                borderRadius: 8, background: "#fff", padding: "0 14px",
                boxShadow: passFocus ? "0 0 0 3px rgba(27,108,168,0.10)" : "none",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}>
                <span style={{ display: "flex", alignItems: "center", marginRight: 10, flexShrink: 0 }}>
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  placeholder="Enter your password"
                  style={{
                    flex: 1, border: "none", outline: "none",
                    padding: "13px 0", fontSize: 14, fontFamily: "Inter",
                    color: NAVY, background: "transparent",
                  }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 0 0 10px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 8, padding: "11px 14px", fontSize: 13, color: "#C62828", fontFamily: "Inter" }}>
                {error}
              </div>
            )}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px 20px",
                background: loading ? "#5A9FD4" : BLUE,
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 16, fontWeight: 700, fontFamily: "Inter",
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 2px 12px rgba(27,108,168,0.30)",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                marginTop: 2,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#155A8A"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = BLUE; }}
            >
              {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight /></>}
            </button>

            {/* Remember me + Forgot password */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
                onClick={() => setRememberMe(v => !v)}>
                <div style={{
                  width: 17, height: 17, borderRadius: 4, flexShrink: 0,
                  background: rememberMe ? BLUE : "#fff",
                  border: `2px solid ${rememberMe ? BLUE : "#C8D4E2"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.12s, border-color 0.12s",
                }}>
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 14, color: "#5A6478", fontFamily: "Inter" }}>Remember me</span>
              </label>
              <button type="button" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: BLUE, fontWeight: 600, fontFamily: "Inter", padding: 0 }}>
                Forgot Password?
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#E8EEF6", margin: "4px 0" }} />

            {/* Register */}
            <div style={{ textAlign: "center", fontSize: 14, color: "#8892A4", fontFamily: "Inter" }}>
              {"Don't have an account? "}
              <button type="button" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: BLUE, fontWeight: 700, fontFamily: "Inter", padding: 0 }}>
                Register
              </button>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#B0BBCC", fontFamily: "Inter" }}>PharmERP v2.1.0</div>
              <div style={{ fontSize: 12, color: "#B0BBCC", fontFamily: "Inter", marginTop: 2 }}>© 2026 City Central Pharmacy</div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
