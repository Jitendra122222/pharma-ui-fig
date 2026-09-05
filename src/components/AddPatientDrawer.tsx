import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (data: PatientFormData) => void;
};

type Step = 1 | 2 | 3 | 4;

export type PatientFormData = {
  customerType: string;
  customerId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  dob: string;
  gender: string;
  patientRefId: string;
  idType: string;
  idNumber: string;
  primaryMobile: string;
  altMobile: string;
  email: string;
  channel: string;
  whatsappConsent: boolean;
  smsConsent: boolean;
  emailConsent: boolean;
  language: string;
  addressType: "same" | "separate";
  addressLine: string;
  apartment: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addSeparateDelivery: boolean;
  branch: string;
  pharmacist: string;
  source: string;
  category: string;
  lastVerifiedDate: string;
  verifiedBy: string;
  billingName: string;
  gstin: string;
  priceList: string;
  creditLimit: string;
  paymentTerms: string;
  taxExempt: boolean;
  loyaltyEnrolled: boolean;
  loyaltyId: string;
  accountRemarks: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  preferredDoctor: string;
  emergencyName: string;
  emergencyPhone: string;
  healthConsent: boolean;
  accountStatus: string;
  safetyRemarks: string;
};

const initialData: PatientFormData = {
  customerType: "Individual",
  customerId: "CUS-000241",
  firstName: "",
  lastName: "",
  preferredName: "",
  dob: "",
  gender: "",
  patientRefId: "",
  idType: "Aadhaar",
  idNumber: "",
  primaryMobile: "",
  altMobile: "",
  email: "",
  channel: "WhatsApp",
  whatsappConsent: true,
  smsConsent: true,
  emailConsent: false,
  language: "English",
  addressType: "same",
  addressLine: "",
  apartment: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  addSeparateDelivery: false,
  branch: "Main Branch",
  pharmacist: "Priya Sharma",
  source: "Walk-in",
  category: "Regular",
  lastVerifiedDate: "",
  verifiedBy: "Priya Sharma",
  billingName: "",
  gstin: "",
  priceList: "Retail Price List",
  creditLimit: "20000",
  paymentTerms: "7 Days",
  taxExempt: false,
  loyaltyEnrolled: true,
  loyaltyId: "LOY-000245",
  accountRemarks: "",
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  preferredDoctor: "",
  emergencyName: "",
  emergencyPhone: "",
  healthConsent: true,
  accountStatus: "Active",
  safetyRemarks: "",
};

const STEPS: { n: Step; title: string; subtitle: string }[] = [
  { n: 1, title: "Identity", subtitle: "Personal & ID details" },
  { n: 2, title: "Contact", subtitle: "Phone, email & address" },
  { n: 3, title: "Account", subtitle: "Credit, branch & pricing" },
  { n: 4, title: "Safety & Review", subtitle: "Health, review & confirm" },
];

const ACCENT = "#1B6CA8";
const BORDER = "#DDE3EC";
const TEXT = "#0C1B33";
const MUTED = "#6B7280";
const LIGHT_BG = "#F8FAFC";

export default function AddPatientDrawer({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<PatientFormData>(initialData);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const goNext = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
    else {
      onCreate?.(data);
      onClose();
      setData(initialData);
    }
  };
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(12, 27, 51, 0.35)",
          zIndex: 100,
          backdropFilter: "blur(2px)",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(1000px, 66vw)",
          background: "#fff",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(12, 27, 51, 0.08)",
        }}
      >
        <DrawerHeader onClose={onClose} />
        <Stepper current={step} />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px" }}>
          {step === 1 && <StepIdentity data={data} update={update} />}
          {step === 2 && <StepContact data={data} update={update} />}
          {step === 3 && <StepAccount data={data} update={update} />}
          {step === 4 && <StepSafetyReview data={data} update={update} />}
        </div>
        <DrawerFooter
          step={step}
          onBack={goBack}
          onNext={goNext}
          onClose={onClose}
        />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "20px 32px 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: "-0.02em" }}>
          Add Patient
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
          Create a complete patient profile
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          border: "none",
          background: "transparent",
          fontSize: 22,
          color: MUTED,
          cursor: "pointer",
          padding: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <div style={{ padding: "16px 32px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {STEPS.map((s, i) => {
          const state: "done" | "active" | "pending" =
            current > s.n ? "done" : current === s.n ? "active" : "pending";
          const circleBg = state === "pending" ? "#fff" : ACCENT;
          const circleBorder = state === "pending" ? BORDER : ACCENT;
          const circleColor = state === "pending" ? MUTED : "#fff";
          const titleColor = state === "pending" ? MUTED : TEXT;
          return (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: 0 }}>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    left: "calc(50% + 20px)",
                    right: "calc(-50% + 20px)",
                    height: 2,
                    background: current > s.n ? ACCENT : BORDER,
                  }}
                />
              )}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: circleBg,
                  border: `2px solid ${circleBorder}`,
                  color: circleColor,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Inter",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {state === "done" ? "✓" : s.n}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: titleColor, textAlign: "center" }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2, textAlign: "center" }}>
                {s.subtitle}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrawerFooter({
  step,
  onBack,
  onNext,
  onClose,
}: {
  step: Step;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const nextLabel =
    step === 1 ? "Next: Contact" :
    step === 2 ? "Next: Account" :
    step === 3 ? "Next: Safety & Review" :
    "Create Patient";
  const progressPct = (step / 4) * 100;
  return (
    <div
      style={{
        padding: "14px 32px",
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 12, color: MUTED }}>
        <span style={{ color: "#C62828" }}>*</span> Required fields
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <span style={{ fontSize: 12, color: MUTED }}>Step {step} of 4</span>
        <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 2, maxWidth: 220 }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: ACCENT, borderRadius: 2, transition: "width 200ms" }} />
        </div>
      </div>
      <button
        onClick={step === 1 ? onClose : onBack}
        style={{
          padding: "9px 20px",
          border: `1px solid ${BORDER}`,
          background: "#fff",
          fontSize: 13,
          color: TEXT,
          cursor: "pointer",
          fontFamily: "Inter",
        }}
      >
        Back
      </button>
      <button
        style={{
          padding: "9px 16px",
          border: `1px solid ${BORDER}`,
          background: "#fff",
          fontSize: 13,
          color: TEXT,
          cursor: "pointer",
          fontFamily: "Inter",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>💾</span> Save Draft
      </button>
      <button
        onClick={onNext}
        style={{
          padding: "9px 22px",
          border: "none",
          background: ACCENT,
          fontSize: 13,
          color: "#fff",
          cursor: "pointer",
          fontWeight: 600,
          fontFamily: "Inter",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {nextLabel}
        <span style={{ fontSize: 14 }}>›</span>
      </button>
    </div>
  );
}

type StepProps = {
  data: PatientFormData;
  update: <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => void;
};

function StepIdentity({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Personal Details" />

      <Row cols={3}>
        <Field label="Customer type" required>
          <Select value={data.customerType} onChange={(v) => update("customerType", v)}
            options={["Individual", "Business"]} />
        </Field>
        <Field label="First name" required>
          <Input value={data.firstName} onChange={(v) => update("firstName", v)} placeholder="e.g. Sunita" />
        </Field>
        <Field label="Last name" required>
          <Input value={data.lastName} onChange={(v) => update("lastName", v)} placeholder="e.g. Verma" />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Preferred name">
          <Input value={data.preferredName} onChange={(v) => update("preferredName", v)} placeholder="Optional" />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={data.dob} onChange={(v) => update("dob", v)} placeholder="DD / MM / YYYY" />
        </Field>
        <Field label="Gender" required>
          <Select value={data.gender} onChange={(v) => update("gender", v)}
            options={["", "Male", "Female", "Other", "Prefer not to say"]}
            placeholder="Select gender" />
        </Field>
      </Row>

      <Row cols={2}>
        <Field label="Profile photo">
          <div style={{
            border: `1px dashed ${BORDER}`,
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: LIGHT_BG,
            cursor: "pointer",
          }}>
            <div style={{ fontSize: 22, color: ACCENT }}>☁</div>
            <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Upload photo</div>
            <div style={{ fontSize: 11, color: MUTED }}>JPG or PNG, up to 2MB</div>
          </div>
        </Field>
        <Field label="Patient reference ID">
          <Input value={data.patientRefId} onChange={(v) => update("patientRefId", v)} placeholder="Optional patient ID" />
        </Field>
      </Row>

      <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
      <SectionHeader title="Government ID" />

      <Row cols={2}>
        <Field label="ID type">
          <Select value={data.idType} onChange={(v) => update("idType", v)}
            options={["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID"]} />
        </Field>
        <Field label="ID number" required>
          <Input value={data.idNumber} onChange={(v) => update("idNumber", v)} placeholder="XXXX XXXX 1234" />
        </Field>
      </Row>

      <InfoNote text="ID will be used for identity verification and compliance." />

      <StatusBanner
        icon="🛡"
        title="No duplicate matches found"
        subtitle="Checked against mobile number and ID details."
        badge="Mobile verified"
      />
    </div>
  );
}

function StepContact({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Contact & Address" />

      <Row cols={2}>
        <Field label="Primary mobile number" required>
          <PhoneInput
            value={data.primaryMobile}
            onChange={(v) => update("primaryMobile", v)}
            placeholder="98765 43210"
            verified={data.primaryMobile.length >= 10}
          />
          {data.primaryMobile.length >= 10 && (
            <div style={{ fontSize: 12, color: "#2E7D32", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span>✓</span> No duplicate found
            </div>
          )}
        </Field>
        <Field label="Alternate mobile number">
          <PhoneInput
            value={data.altMobile}
            onChange={(v) => update("altMobile", v)}
            placeholder="Enter alternate number"
          />
        </Field>
      </Row>

      <Row cols={2}>
        <Field label="Email address" required>
          <Input value={data.email} onChange={(v) => update("email", v)} placeholder="customer@email.com" type="email" />
        </Field>
        <Field label="Preferred communication channel" required>
          <Select value={data.channel} onChange={(v) => update("channel", v)}
            options={["WhatsApp", "SMS", "Email", "Phone call"]} />
        </Field>
      </Row>

      <Row cols={3}>
        <ToggleField
          label="WhatsApp consent" required
          value={data.whatsappConsent}
          onChange={(v) => update("whatsappConsent", v)}
          hint="Customer agrees to receive updates on WhatsApp."
        />
        <ToggleField
          label="SMS consent" required
          value={data.smsConsent}
          onChange={(v) => update("smsConsent", v)}
          hint="Customer agrees to receive SMS updates."
        />
        <ToggleField
          label="Email consent"
          value={data.emailConsent}
          onChange={(v) => update("emailConsent", v)}
          hint="Customer agrees to receive email updates."
        />
      </Row>

      <Row cols={2}>
        <Field label="Preferred language">
          <Select value={data.language} onChange={(v) => update("language", v)}
            options={["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi", "Gujarati"]} />
        </Field>
        <Field label="Address type" required>
          <div style={{ display: "flex", gap: 24, paddingTop: 8 }}>
            {[
              { v: "same", label: "Same as delivery address" },
              { v: "separate", label: "Separate billing address" },
            ].map((o) => (
              <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: TEXT, cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={data.addressType === (o.v as "same" | "separate")}
                  onChange={() => update("addressType", o.v as "same" | "separate")}
                  style={{ accentColor: ACCENT }}
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Address line" required>
          <Input value={data.addressLine} onChange={(v) => update("addressLine", v)} placeholder="House / building, street, locality" />
        </Field>
        <Field label="Apartment / Building / Floor">
          <Input value={data.apartment} onChange={(v) => update("apartment", v)} placeholder="Optional" />
        </Field>
        <Field label="Landmark">
          <Input value={data.landmark} onChange={(v) => update("landmark", v)} placeholder="Optional" />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="City" required>
          <Input value={data.city} onChange={(v) => update("city", v)} />
        </Field>
        <Field label="State" required>
          <Select value={data.state} onChange={(v) => update("state", v)}
            options={["", "Haryana", "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal", "Uttar Pradesh"]}
            placeholder="Select state" />
        </Field>
        <Field label="PIN code" required>
          <Input value={data.pincode} onChange={(v) => update("pincode", v)} placeholder="122001" />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Country" required>
          <Select value={data.country} onChange={(v) => update("country", v)}
            options={["India", "Nepal", "Sri Lanka", "Bangladesh"]} />
        </Field>
      </Row>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={data.addSeparateDelivery}
          onChange={(e) => update("addSeparateDelivery", e.target.checked)}
          style={{ accentColor: ACCENT }}
        />
        Add separate delivery address
      </label>
    </div>
  );
}

function StepAccount({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Account & Pharmacy Relationship" />

      <Row cols={3}>
        <Field label="Preferred branch" required>
          <Select value={data.branch} onChange={(v) => update("branch", v)}
            options={["Main Branch", "North Branch", "South Branch", "East Branch"]} />
        </Field>
        <Field label="Assigned pharmacist" required>
          <Select value={data.pharmacist} onChange={(v) => update("pharmacist", v)}
            options={["Priya Sharma", "Rahul Kumar", "Anita Verma", "Sanjay Patel"]} />
        </Field>
        <Field label="Customer source / referral" required>
          <Select value={data.source} onChange={(v) => update("source", v)}
            options={["Walk-in", "Referral", "Online", "Doctor referral", "Corporate tie-up"]} />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Customer category" required>
          <Select value={data.category} onChange={(v) => update("category", v)}
            options={["Regular", "VIP", "Senior citizen", "Corporate", "Institution"]} />
        </Field>
        <Field label="Last verification date">
          <Input type="date" value={data.lastVerifiedDate} onChange={(v) => update("lastVerifiedDate", v)} />
        </Field>
        <Field label="Verified by user">
          <Select value={data.verifiedBy} onChange={(v) => update("verifiedBy", v)}
            options={["Priya Sharma", "Rahul Kumar", "Anita Verma"]} />
        </Field>
      </Row>

      <Row cols={2}>
        <Field label="Billing name" required>
          <Input value={data.billingName} onChange={(v) => update("billingName", v)} placeholder="Legal / billing name" />
        </Field>
        <Field label="GSTIN" hint="(for business customers)">
          <Input value={data.gstin} onChange={(v) => update("gstin", v)} placeholder="27ABCDE1234F1Z5" />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Price list / Customer segment">
          <Select value={data.priceList} onChange={(v) => update("priceList", v)}
            options={["Retail Price List", "Wholesale", "Institution", "Corporate"]} />
        </Field>
        <Field label="Credit limit (₹)" required>
          <Input value={data.creditLimit} onChange={(v) => update("creditLimit", v)} placeholder="20,000.00" />
        </Field>
        <Field label="Default payment terms" required>
          <Select value={data.paymentTerms} onChange={(v) => update("paymentTerms", v)}
            options={["Cash on delivery", "7 Days", "15 Days", "30 Days", "45 Days"]} />
        </Field>
      </Row>

      <Row cols={3}>
        <ToggleField
          label="Tax-exempt"
          value={data.taxExempt}
          onChange={(v) => update("taxExempt", v)}
          hint="Customer is exempt from tax"
        />
        <ToggleField
          label="Loyalty enrollment"
          value={data.loyaltyEnrolled}
          onChange={(v) => update("loyaltyEnrolled", v)}
          hint="Enroll customer in loyalty program"
        />
        <Field label="Loyalty ID">
          <Input value={data.loyaltyId} onChange={(v) => update("loyaltyId", v)} placeholder="LOY-000245" />
        </Field>
      </Row>

      <Field label="Account remarks">
        <Textarea
          value={data.accountRemarks}
          onChange={(v) => update("accountRemarks", v)}
          maxLength={250}
          rows={3}
          placeholder="Optional internal notes for this account"
        />
      </Field>

      <InfoNote
        title="Credit policy notice"
        text="The credit limit specified above will be used for Sales Invoice validation and credit control."
      />
    </div>
  );
}

function StepSafetyReview({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Patient Safety & Review" />

      <Row cols={3}>
        <Field label="Known allergies">
          <Textarea value={data.allergies} onChange={(v) => update("allergies", v)}
            maxLength={500} rows={3} placeholder="e.g. Penicillin, Sulfa drugs" />
        </Field>
        <Field label="Preferred doctor & clinic">
          <Input value={data.preferredDoctor} onChange={(v) => update("preferredDoctor", v)} placeholder="Doctor or clinic name (optional)" />
        </Field>
        <Field label="Account status" required>
          <Select value={data.accountStatus} onChange={(v) => update("accountStatus", v)}
            options={["Active", "Inactive", "On hold"]} />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Chronic conditions">
          <Textarea value={data.chronicConditions} onChange={(v) => update("chronicConditions", v)}
            maxLength={500} rows={3} placeholder="e.g. Diabetes, Hypertension" />
        </Field>
        <Field label="Emergency contact name">
          <Input value={data.emergencyName} onChange={(v) => update("emergencyName", v)} placeholder="Full name (optional)" />
        </Field>
        <Field label="Account remarks">
          <Textarea value={data.safetyRemarks} onChange={(v) => update("safetyRemarks", v)}
            maxLength={250} rows={3} placeholder="Add any internal remarks (optional)" />
        </Field>
      </Row>

      <Row cols={3}>
        <Field label="Current medications">
          <Textarea value={data.currentMedications} onChange={(v) => update("currentMedications", v)}
            maxLength={500} rows={3} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" />
        </Field>
        <Field label="Emergency contact phone">
          <PhoneInput value={data.emergencyPhone} onChange={(v) => update("emergencyPhone", v)} placeholder="Enter mobile number" />
        </Field>
        <Field label="Documents" hint="(ID or supporting documents)">
          <div style={{
            border: `1px dashed ${BORDER}`,
            padding: "22px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: LIGHT_BG,
            cursor: "pointer",
          }}>
            <div style={{ fontSize: 20, color: ACCENT }}>☁</div>
            <div style={{ fontSize: 12, color: TEXT, textAlign: "center" }}>Drag and drop files here or click to upload</div>
            <div style={{ fontSize: 11, color: MUTED }}>JPG, PNG, PDF up to 5MB each</div>
          </div>
        </Field>
      </Row>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ToggleField
          label="Consent to store health notes"
          value={data.healthConsent}
          onChange={(v) => update("healthConsent", v)}
          hint="Customer consents to store and use health information for care."
        />
        <InfoNote
          title="Privacy notice"
          text="Health notes are visible only to authorized pharmacy staff and kept confidential."
        />
      </div>

      <Row cols={3}>
        <SummaryCard
          icon="✓"
          title="Duplicate-customer check"
          heading="No duplicate matches found"
          note="Checked against name, mobile, email, and ID."
          color="#2E7D32"
        />
        <SummaryCard
          icon="✓"
          title="Mobile verification"
          heading={data.primaryMobile ? `+91 ${data.primaryMobile}` : "Mobile number verified"}
          note="Verified on completion of contact step."
          color="#2E7D32"
        />
        <SummaryCard
          icon="📋"
          title="Required fields summary"
          heading="All required fields completed"
          note="All mandatory information has been provided."
          color={ACCENT}
        />
      </Row>

      <div style={{ background: LIGHT_BG, border: `1px solid ${BORDER}`, padding: "14px 18px" }}>
        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Audit trail (preview)
        </div>
        <Row cols={3}>
          <div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>Created by</div>
            <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{data.pharmacist}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>Created date</div>
            <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>Draft — will stamp on save</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>Last updated</div>
            <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>Draft — will stamp on save</div>
          </div>
        </Row>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "14px 18px" }}>
        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Review summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {[
            { label: "Customer name", value: `${data.firstName || "—"} ${data.lastName || ""}`.trim() },
            { label: "Mobile number", value: data.primaryMobile ? `+91 ${data.primaryMobile}` : "—" },
            { label: "Branch", value: data.branch },
            { label: "Customer category", value: data.category },
            { label: "Credit limit", value: `₹ ${data.creditLimit || "0"}` },
          ].map((r) => (
            <div key={r.label}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Small reusable UI atoms --------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 11,
      color: ACCENT,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    }}>
      {title}
    </div>
  );
}

function Row({ cols, children }: { cols: 2 | 3; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
        {hint && <span style={{ color: MUTED, fontWeight: 400, marginLeft: 4 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "9px 12px",
  border: `1px solid ${BORDER}`,
  background: "#fff",
  fontSize: 13,
  color: TEXT,
  outline: "none",
  fontFamily: "Inter",
  width: "100%",
};

function Input({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: "auto" }}
    >
      {placeholder && !value && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o === "" ? (placeholder || "Select") : o}</option>
      ))}
    </select>
  );
}

function PhoneInput({
  value, onChange, placeholder, verified,
}: { value: string; onChange: (v: string) => void; placeholder?: string; verified?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${BORDER}`, background: "#fff" }}>
      <div style={{
        padding: "9px 10px",
        background: LIGHT_BG,
        fontSize: 13,
        color: MUTED,
        borderRight: `1px solid ${BORDER}`,
        fontFamily: "JetBrains Mono",
      }}>+91</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, border: "none", flex: 1 }}
      />
      {verified && (
        <div style={{
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "#2E7D32",
          fontWeight: 600,
          background: "#E8F5E9",
          borderLeft: `1px solid ${BORDER}`,
        }}>
          Verified <span>✓</span>
        </div>
      )}
    </div>
  );
}

function Textarea({
  value, onChange, placeholder, maxLength, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; rows?: number }) {
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter" }}
      />
      {maxLength && (
        <div style={{
          position: "absolute", bottom: 6, right: 8, fontSize: 10, color: MUTED,
          fontFamily: "JetBrains Mono", pointerEvents: "none",
        }}>
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}

function ToggleField({
  label, required, value, onChange, hint,
}: { label: string; required?: boolean; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      >
        <div style={{
          width: 34,
          height: 20,
          borderRadius: 999,
          background: value ? ACCENT : "#CBD5E1",
          position: "relative",
          transition: "background 150ms",
          flexShrink: 0,
        }}>
          <div style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: value ? 17 : 3,
            transition: "left 150ms",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }} />
        </div>
        {hint && <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{hint}</span>}
      </div>
    </div>
  );
}

function InfoNote({ title, text }: { title?: string; text: string }) {
  return (
    <div style={{
      display: "flex",
      gap: 10,
      background: "#EFF8FB",
      border: "1px solid #B8E0EE",
      padding: "12px 14px",
      alignItems: "flex-start",
    }}>
      <div style={{ color: ACCENT, fontSize: 14, lineHeight: 1.4 }}>ⓘ</div>
      <div>
        {title && <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{title}</div>}
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

function StatusBanner({
  icon, title, subtitle, badge,
}: { icon: string; title: string; subtitle: string; badge?: string }) {
  return (
    <div style={{
      background: "#E8F5E9",
      border: "1px solid #A5D6A7",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 18, color: "#2E7D32" }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1B5E20" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#33691E", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {badge && (
        <div style={{
          padding: "5px 12px",
          background: "#fff",
          border: "1px solid #A5D6A7",
          fontSize: 12,
          color: "#2E7D32",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {badge} <span>✓</span>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, title, heading, note, color,
}: { icon: string; title: string; heading: string; note: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontSize: 16, color }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color }}>{heading}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{note}</div>
        </div>
      </div>
    </div>
  );
}
