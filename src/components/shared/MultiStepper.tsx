export interface StepItem {
  label: string;
  subtitle?: string;
}

export interface MultiStepperProps {
  /** Array of step labels or full StepItem objects with optional subtitle. */
  steps: (string | StepItem)[];
  /** 1-based index of the current active step. */
  current: number;
  /**
   * "tinted"  — done = green-wash circle + green connector (default, Purchases / Inventory)
   * "filled"  — done = solid blue fill, same as active (Patients / AddPatientDrawer)
   */
  doneStyle?: "tinted" | "filled";
  /** Remove the top & bottom border lines that normally frame the stepper. */
  noBorder?: boolean;
}

function normalise(s: string | StepItem): StepItem {
  return typeof s === "string" ? { label: s } : s;
}

export default function MultiStepper({
  steps,
  current,
  doneStyle = "tinted",
  noBorder = false,
}: MultiStepperProps) {
  const items = steps.map(normalise);
  const hasSubtitles = items.some(s => !!s.subtitle);

  return (
    <div style={{
      display: "flex",
      alignItems: hasSubtitles ? "flex-start" : "center",
      padding: "14px 32px",
      background: "#FAFBFD",
      borderTop: noBorder ? undefined : "1px solid #EEF1F6",
      borderBottom: noBorder ? undefined : "1px solid #EEF1F6",
      flexShrink: 0,
    }}>
      {items.map((item, i) => {
        const n = i + 1;
        const state: "done" | "active" | "idle" =
          current > n ? "done" : current === n ? "active" : "idle";
        const isLast = i === items.length - 1;

        // Circle colours
        let circleBg: string;
        let circleBorder: string;
        let circleColor: string;
        let connectorColor: string;
        let labelColor: string;
        let labelWeight: number;

        if (state === "done") {
          if (doneStyle === "filled") {
            circleBg = "#1B6CA8"; circleBorder = "#1B6CA8"; circleColor = "#fff";
            connectorColor = "#1B6CA8";
          } else {
            circleBg = "#E8F5E9"; circleBorder = "#2E7D32"; circleColor = "#2E7D32";
            connectorColor = "#A5D6A7";
          }
          labelColor = doneStyle === "filled" ? "#0C1B33" : "#2E7D32";
          labelWeight = 700;
        } else if (state === "active") {
          circleBg = doneStyle === "filled" ? "#1B6CA8" : "#EFF6FF";
          circleBorder = "#1B6CA8";
          circleColor = doneStyle === "filled" ? "#fff" : "#1B6CA8";
          connectorColor = "#DDE3EC";
          labelColor = "#1B6CA8";
          labelWeight = 700;
        } else {
          circleBg = "#F5F5F5"; circleBorder = "#DDE3EC"; circleColor = "#9CA3AF";
          connectorColor = "#DDE3EC";
          labelColor = "#9CA3AF";
          labelWeight = 500;
        }

        return (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: hasSubtitles ? "flex-start" : "center",
              flex: isLast ? "0 0 auto" : 1,
            }}
          >
            {/* Step content */}
            <div style={{
              display: "flex",
              flexDirection: hasSubtitles ? "column" : "row",
              alignItems: "center",
              gap: hasSubtitles ? 0 : 10,
            }}>
              {/* Circle */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: circleBg,
                border: `1.5px solid ${circleBorder}`,
                color: circleColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "JetBrains Mono",
                flexShrink: 0,
                position: "relative",
                zIndex: 1,
              }}>
                {state === "done" ? "✓" : String(n).padStart(2, "0")}
              </div>

              {/* Label + subtitle */}
              <div style={{
                marginTop: hasSubtitles ? 8 : 0,
                textAlign: hasSubtitles ? "center" : "left",
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: labelWeight,
                  color: labelColor,
                  whiteSpace: "nowrap",
                }}>
                  {item.label}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, whiteSpace: "nowrap" }}>
                    {item.subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Connector */}
            {!isLast && (
              hasSubtitles ? (
                // Absolute-positioned horizontal line centred on the circle row
                <div style={{
                  flex: 1,
                  height: 2,
                  background: state === "done" ? connectorColor : "#DDE3EC",
                  margin: "0 8px",
                  marginTop: 14, // vertically aligns with circle centre (28/2 - 1)
                  alignSelf: "flex-start",
                  minWidth: 16,
                }} />
              ) : (
                <div style={{
                  flex: 1,
                  height: 1,
                  background: state === "done" ? connectorColor : "#DDE3EC",
                  margin: "0 14px",
                  minWidth: 20,
                }} />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
