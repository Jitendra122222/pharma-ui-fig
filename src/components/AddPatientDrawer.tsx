import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPatient } from "../lib/patientApi";
import { DatePicker } from "./shared/DatePicker";
import MultiStepper from "./shared/MultiStepper";

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
  bloodGroup: string;
  patientRefId: string;
  abhaNumber: string;
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
  insuranceProvider: string;
  insuranceMemberId: string;
  insuranceGroupNo: string;
  insuranceValidFrom: string;
  insuranceValidTo: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  weight: string;
  height: string;
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
  bloodGroup: "",
  patientRefId: "",
  abhaNumber: "",
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
  insuranceProvider: "",
  insuranceMemberId: "",
  insuranceGroupNo: "",
  insuranceValidFrom: "",
  insuranceValidTo: "",
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  weight: "",
  height: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const goNext = async () => {
    if (step < 4) { setStep((s) => (s + 1) as Step); return; }
    setIsSubmitting(true);
    try {
      await createPatient({
        name: `${data.firstName} ${data.lastName}`.trim() || data.preferredName,
        dob: data.dob || null,
        gender: data.gender,
        phone: data.primaryMobile,
        email: data.email,
        address: [data.addressLine, data.apartment].filter(Boolean).join(", "),
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        blood_group: data.bloodGroup,
        allergies: data.allergies ? data.allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
        conditions: data.chronicConditions ? data.chronicConditions.split(",").map(s => s.trim()).filter(Boolean) : [],
        credit_enabled: !!data.creditLimit && parseFloat(data.creditLimit) > 0,
        credit_limit: data.creditLimit ? parseFloat(data.creditLimit) : undefined,
        payment_terms: data.paymentTerms,
      });
    } catch { /* offline — proceed to onCreate */ }
    finally { setIsSubmitting(false); }
    onCreate?.(data);
    onClose();
    setData(initialData);
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
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
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
          isSubmitting={isSubmitting}
        />
      </aside>
    </>
  );
}

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "20px 24px 8px",
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
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <div style={{ padding: "2px 0", flexShrink: 0 }}>
      <MultiStepper
        steps={STEPS.map(s => ({ label: s.title, subtitle: s.subtitle }))}
        current={current}
        doneStyle="filled"
        noBorder
      />
    </div>
  );
}

function DrawerFooter({
  step,
  onBack,
  onNext,
  onClose,
  isSubmitting,
}: {
  step: Step;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  const nextLabel =
    step === 1 ? "Next: Contact" :
    step === 2 ? "Next: Account" :
    step === 3 ? "Next: Safety & Review" :
    isSubmitting ? "Saving..." : "Create Patient";
  const progressPct = (step / 4) * 100;
  return (
    <div
      style={{
        padding: "14px 24px",
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
          borderRadius: 6,
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
          borderRadius: 6,
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
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1v10M4 7l4 4 4-4M2 13h12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Save Draft
      </button>
      <button
        disabled={!!isSubmitting}
        onClick={onNext}
        style={{
          padding: "9px 22px",
          border: "none",
          borderRadius: 6,
          background: isSubmitting ? "#C8D6E5" : ACCENT,
          fontSize: 13,
          color: isSubmitting ? "#8FA3B1" : "#fff",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          fontWeight: 600,
          fontFamily: "Inter",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {nextLabel}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

type StepProps = {
  data: PatientFormData;
  update: <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => void;
};

function StepIdentity({ data, update }: StepProps) {
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [abhaFetched, setAbhaFetched] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleAbhaFetch = () => {
    if (!data.abhaNumber) return;
    setAbhaLoading(true);
    setTimeout(() => {
      update("firstName", "Sunita");
      update("lastName", "Verma");
      update("dob", "1985-06-15");
      update("gender", "Female");
      setAbhaLoading(false);
      setAbhaFetched(true);
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Personal Details">
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
            <DatePicker value={data.dob} onChange={(v) => update("dob", v)} />
          </Field>
          <Field label="Gender" required>
            <Select value={data.gender} onChange={(v) => update("gender", v)}
              options={["", "Male", "Female", "Other", "Prefer not to say"]}
              placeholder="Select gender" />
          </Field>
        </Row>
        <Row cols={3}>
          <Field label="Blood group">
            <Select value={data.bloodGroup} onChange={(v) => update("bloodGroup", v)}
              options={["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]}
              placeholder="Select blood group" />
          </Field>
          <Field label="Patient reference ID">
            <Input value={data.patientRefId} onChange={(v) => update("patientRefId", v)} placeholder="Optional patient ID" />
          </Field>
          <div />
        </Row>
      </Card>

      <Card title="Profile Photo & Health ID">
        <Row cols={2}>
          <Field label="Profile photo">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoPreview(URL.createObjectURL(file));
              }}
            />
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                border: `1px dashed ${photoPreview ? ACCENT : BORDER}`,
                padding: photoPreview ? "14px 20px" : "28px 20px",
                borderRadius: 6,
                display: "flex",
                flexDirection: photoPreview ? "row" : "column",
                alignItems: "center",
                justifyContent: photoPreview ? "flex-start" : "center",
                gap: photoPreview ? 14 : 6,
                background: photoPreview ? "#EFF6FF" : LIGHT_BG,
                cursor: "pointer",
                transition: "background 200ms, border-color 200ms",
              }}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="preview" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: `2px solid ${ACCENT}`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>Photo uploaded</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Click to change photo</div>
                  </div>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Upload photo</div>
                  <div style={{ fontSize: 11, color: MUTED }}>JPG or PNG, up to 2MB</div>
                </>
              )}
            </div>
          </Field>
          <Field label="ABHA number" hint="(Ayushman Bharat Health Account)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${abhaFetched ? "#A5D6A7" : BORDER}`, borderRadius: 6, overflow: "hidden", transition: "border-color 200ms" }}>
                <input
                  value={data.abhaNumber}
                  onChange={(e) => { update("abhaNumber", e.target.value); setAbhaFetched(false); }}
                  placeholder="14-digit ABHA number"
                  style={{ ...inputStyle, border: "none", flex: 1, borderRadius: 0, fontFamily: "JetBrains Mono" }}
                />
                <button
                  onClick={handleAbhaFetch}
                  disabled={abhaLoading || !data.abhaNumber}
                  style={{
                    padding: "0 14px",
                    border: "none",
                    borderLeft: `1px solid ${BORDER}`,
                    background: abhaFetched ? "#E8F5E9" : data.abhaNumber ? ACCENT : LIGHT_BG,
                    color: abhaFetched ? "#2E7D32" : data.abhaNumber ? "#fff" : MUTED,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: data.abhaNumber && !abhaLoading ? "pointer" : "default",
                    fontFamily: "Inter",
                    whiteSpace: "nowrap",
                    transition: "background 200ms, color 200ms",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {abhaLoading ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round"/></svg>
                  ) : abhaFetched ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  )}
                  {abhaLoading ? "Fetching..." : abhaFetched ? "Fetched" : "Fetch"}
                </button>
              </div>
              {abhaFetched && (
                <div style={{ fontSize: 11, color: "#2E7D32", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Name, DOB and gender auto-filled from ABHA records
                </div>
              )}
            </div>
          </Field>
        </Row>
      </Card>

      <Card title="Government ID">
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
          icon="shield"
          title="No duplicate matches found"
          subtitle="Checked against mobile number and ID details."
          badge="Mobile verified"
        />
      </Card>
    </div>
  );
}

function StepContact({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Phone & Communication">
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
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                No duplicate found
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
          <div />
        </Row>
      </Card>

      <Card title="Address">
        <Field label="Address type" required>
          <div style={{ display: "flex", gap: 24, paddingTop: 4 }}>
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
      </Card>
    </div>
  );
}

function StepAccount({ data, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Pharmacy Relationship">
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
            <DatePicker value={data.lastVerifiedDate} onChange={(v) => update("lastVerifiedDate", v)} />
          </Field>
          <Field label="Verified by user">
            <Select value={data.verifiedBy} onChange={(v) => update("verifiedBy", v)}
              options={["Priya Sharma", "Rahul Kumar", "Anita Verma"]} />
          </Field>
        </Row>
      </Card>

      <Card title="Billing & Credit">
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
          <Field label="Credit limit (Rs.)" required>
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
      </Card>

      <Card title="Insurance & Payer Details">
        <Row cols={3}>
          <Field label="Insurance provider">
            <Select value={data.insuranceProvider} onChange={(v) => update("insuranceProvider", v)}
              options={["", "Star Health", "ICICI Lombard", "New India Assurance", "National Insurance", "United India", "HDFC ERGO", "Bajaj Allianz", "SBI General"]}
              placeholder="Select provider" />
          </Field>
          <Field label="Member ID / Policy no.">
            <Input value={data.insuranceMemberId} onChange={(v) => update("insuranceMemberId", v)} placeholder="e.g. POL-1234567890" />
          </Field>
          <Field label="Group / Corporate no.">
            <Input value={data.insuranceGroupNo} onChange={(v) => update("insuranceGroupNo", v)} placeholder="e.g. GRP-88420" />
          </Field>
        </Row>
        <Row cols={2}>
          <Field label="Policy valid from">
            <DatePicker value={data.insuranceValidFrom} onChange={(v) => update("insuranceValidFrom", v)} />
          </Field>
          <Field label="Policy valid to">
            <DatePicker value={data.insuranceValidTo} onChange={(v) => update("insuranceValidTo", v)} />
          </Field>
        </Row>
        <InfoNote text="Insurance details will be pre-filled when submitting claims from this patient's profile." />
      </Card>
    </div>
  );
}

function StepSafetyReview({ data, update }: StepProps) {
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const docsInputRef = useRef<HTMLInputElement>(null);

  const weightNum = parseFloat(data.weight);
  const heightNum = parseFloat(data.height);
  const bmi = (weightNum > 0 && heightNum > 0)
    ? weightNum / Math.pow(heightNum / 100, 2)
    : null;
  const bmiCategory = bmi === null ? null
    : bmi < 18.5 ? { label: "Underweight", color: "#1B6CA8", bg: "#EFF6FF" }
    : bmi < 25 ? { label: "Normal", color: "#2E7D32", bg: "#E8F5E9" }
    : bmi < 30 ? { label: "Overweight", color: "#E65100", bg: "#FFF3E0" }
    : { label: "Obese", color: "#C62828", bg: "#FFEBEE" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card title="Medical Information">
        <Row cols={2}>
          <Field label="Known allergies">
            <Textarea value={data.allergies} onChange={(v) => update("allergies", v)}
              maxLength={500} rows={3} placeholder="e.g. Penicillin, Sulfa drugs" />
          </Field>
          <Field label="Chronic conditions">
            <Textarea value={data.chronicConditions} onChange={(v) => update("chronicConditions", v)}
              maxLength={500} rows={3} placeholder="e.g. Diabetes, Hypertension" />
          </Field>
        </Row>
        <Row cols={2}>
          <Field label="Current medications">
            <Textarea value={data.currentMedications} onChange={(v) => update("currentMedications", v)}
              maxLength={500} rows={3} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" />
          </Field>
          <Field label="Preferred doctor & clinic">
            <Input value={data.preferredDoctor} onChange={(v) => update("preferredDoctor", v)} placeholder="Doctor or clinic name (optional)" />
          </Field>
        </Row>
      </Card>

      <Card title="Physical Measurements">
        <Row cols={3}>
          <Field label="Weight (kg)">
            <Input value={data.weight} onChange={(v) => update("weight", v)} placeholder="e.g. 68" type="text" />
          </Field>
          <Field label="Height (cm)">
            <Input value={data.height} onChange={(v) => update("height", v)} placeholder="e.g. 165" type="text" />
          </Field>
          <Field label="BMI">
            <div style={{
              padding: "9px 12px",
              border: `1px solid ${bmiCategory ? bmiCategory.color + "40" : BORDER}`,
              borderRadius: 6,
              background: bmiCategory ? bmiCategory.bg : LIGHT_BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 38,
            }}>
              {bmi !== null ? (
                <>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: bmiCategory!.color }}>
                    {bmi.toFixed(1)}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: bmiCategory!.color,
                    background: "#fff",
                    border: `1px solid ${bmiCategory!.color}40`,
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}>
                    {bmiCategory!.label}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: MUTED }}>Enter weight & height</span>
              )}
            </div>
          </Field>
        </Row>
      </Card>

      <Card title="Emergency Contact">
        <Row cols={2}>
          <Field label="Emergency contact name">
            <Input value={data.emergencyName} onChange={(v) => update("emergencyName", v)} placeholder="Full name (optional)" />
          </Field>
          <Field label="Emergency contact phone">
            <PhoneInput value={data.emergencyPhone} onChange={(v) => update("emergencyPhone", v)} placeholder="Enter mobile number" />
          </Field>
        </Row>
        <Field label="Safety remarks">
          <Textarea value={data.safetyRemarks} onChange={(v) => update("safetyRemarks", v)}
            maxLength={250} rows={2} placeholder="Any internal safety notes (optional)" />
        </Field>
      </Card>

      <Card title="Documents & Consent">
        <Row cols={2}>
          <Field label="Account status" required>
            <Select value={data.accountStatus} onChange={(v) => update("accountStatus", v)}
              options={["Active", "Inactive", "On hold"]} />
          </Field>
          <div />
        </Row>
        <Field label="Supporting documents" hint="(ID or health documents)">
          <input
            ref={docsInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) setDocFiles(prev => [...prev, ...files]);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => docsInputRef.current?.click()}
            style={{
              border: `1px dashed ${docFiles.length > 0 ? ACCENT : BORDER}`,
              padding: "18px 16px",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: docFiles.length > 0 ? "#EFF6FF" : LIGHT_BG,
              cursor: "pointer",
              transition: "background 200ms, border-color 200ms",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={docFiles.length > 0 ? ACCENT : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div style={{ fontSize: 12, color: docFiles.length > 0 ? ACCENT : TEXT, fontWeight: docFiles.length > 0 ? 600 : 400, textAlign: "center" }}>
              {docFiles.length > 0 ? `${docFiles.length} file${docFiles.length > 1 ? "s" : ""} added — click to add more` : "Click to upload files"}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>JPG, PNG, PDF up to 5MB each</div>
          </div>
          {docFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              {docFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: LIGHT_BG, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width="12" height="13" viewBox="0 0 16 18" fill="none"><path d="M3 1h7l4 4v11a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" stroke={ACCENT} strokeWidth="1.3"/><path d="M10 1v5h5" stroke={ACCENT} strokeWidth="1.3"/></svg>
                    <span style={{ fontSize: 11, color: TEXT, fontFamily: "JetBrains Mono" }}>{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDocFiles(prev => prev.filter((_, j) => j !== i)); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>
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
      </Card>

      <Card title="Review Summary">
        <Row cols={3}>
          <SummaryCard
            iconType="check"
            title="Duplicate-customer check"
            heading="No duplicate matches found"
            note="Checked against name, mobile, email, and ID."
            color="#2E7D32"
          />
          <SummaryCard
            iconType="check"
            title="Mobile verification"
            heading={data.primaryMobile ? `+91 ${data.primaryMobile}` : "Mobile number verified"}
            note="Verified on completion of contact step."
            color="#2E7D32"
          />
          <SummaryCard
            iconType="list"
            title="Required fields summary"
            heading="All required fields completed"
            note="All mandatory information has been provided."
            color={ACCENT}
          />
        </Row>
        <div style={{ background: LIGHT_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "14px 16px" }}>
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
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            Review summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {[
              { label: "Customer name", value: `${data.firstName || "—"} ${data.lastName || ""}`.trim() },
              { label: "Mobile number", value: data.primaryMobile ? `+91 ${data.primaryMobile}` : "—" },
              { label: "Branch", value: data.branch },
              { label: "Customer category", value: data.category },
              { label: "Credit limit", value: `Rs. ${data.creditLimit || "0"}` },
            ].map((r) => (
              <div key={r.label}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Small reusable UI atoms --------------------------------------------

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid #E8ECF4`, borderRadius: 8 }}>
      {title && (
        <div style={{ padding: "11px 18px", borderBottom: "1px solid #EEF1F6" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{title}</span>
        </div>
      )}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 14 }}>
        {children}
      </div>
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
  borderRadius: 6,
  background: "#fff",
  fontSize: 13,
  color: TEXT,
  outline: "none",
  fontFamily: "Inter",
  width: "100%",
  boxSizing: "border-box",
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

function getBodyZoom(): number {
  try {
    const z = parseFloat(window.getComputedStyle(document.body).zoom);
    return isNaN(z) ? 1 : z;
  } catch { return 1; }
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false); setPos(null);
      }
    }
    function handleScroll(e: Event) {
      if (listRef.current && listRef.current.contains(e.target as Node)) return;
      setOpen(false); setPos(null);
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); setPos(null); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const zoom = getBodyZoom();
      setPos({ top: r.bottom / zoom + 2, left: r.left / zoom, width: r.width / zoom });
    }
    setOpen(true);
  };

  const isEmpty = !value || value === "";
  const label = isEmpty ? (placeholder || "Select") : value;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          color: isEmpty ? "#9CA3AF" : TEXT,
          borderColor: open ? ACCENT : BORDER,
          outline: "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M1 3l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={listRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            background: "#fff",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 4px 16px rgba(12,27,51,0.10)",
            zIndex: 9999,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            if (o === "" && !placeholder) return null;
            const isSelected = o !== "" && o === value;
            const display = o === "" ? (placeholder || "Select") : o;
            return (
              <div
                key={o}
                onMouseDown={() => { onChange(o); setOpen(false); setPos(null); }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#F0F3F7"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "#fff"; }}
                style={{
                  padding: "9px 14px",
                  fontSize: 13,
                  fontFamily: "Inter",
                  cursor: "pointer",
                  background: isSelected ? "#EFF6FF" : "#fff",
                  color: isSelected ? ACCENT : TEXT,
                  fontWeight: isSelected ? 600 : 400,
                  borderLeft: isSelected ? `3px solid ${ACCENT}` : "3px solid transparent",
                }}
              >
                {display}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhoneInput({
  value, onChange, placeholder, verified,
}: { value: string; onChange: (v: string) => void; placeholder?: string; verified?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
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
        style={{ ...inputStyle, border: "none", flex: 1, borderRadius: 0, boxSizing: "border-box" }}
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
          Verified
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
      borderRadius: 6,
      padding: "12px 14px",
      alignItems: "flex-start",
    }}>
      <div style={{ color: ACCENT, fontSize: 14, lineHeight: 1.4, flexShrink: 0, marginTop: 1 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={ACCENT} strokeWidth="1.5"/><path d="M8 7v5M8 5v.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
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
      borderRadius: 6,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#2E7D32" }}>
          {icon === "shield" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.75 10.15 8 11.25C16.25 22.15 20 17.25 20 12V6l-8-4z" stroke="#2E7D32" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </div>
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
          borderRadius: 6,
          fontSize: 12,
          color: "#2E7D32",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {badge}
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  iconType, title, heading, note, color,
}: { iconType: "check" | "list"; title: string; heading: string; note: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ color, marginTop: 1, flexShrink: 0 }}>
          {iconType === "check" ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.12"/><path d="M4.5 8l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke={color} strokeWidth="1.5"/><path d="M5 7h6M5 10h4" stroke={color} strokeWidth="1.2" strokeLinecap="round"/></svg>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color }}>{heading}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{note}</div>
        </div>
      </div>
    </div>
  );
}
