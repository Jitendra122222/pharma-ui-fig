import { useState } from "react";
import { TabBar } from "./shared/TabBar";
import { SubTab, TABS } from "./insurance/insuranceData";
import Claims from "./insurance/Claims";
import SubmitClaim from "./insurance/SubmitClaim";
import Providers from "./insurance/Providers";
import Eligibility from "./insurance/Eligibility";

export default function Insurance() {
  const [tab, setTab] = useState<SubTab>("claims");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Insurance & Claims</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Claims management · Provider contracts · Eligibility verification</div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />
      {tab === "claims" && <Claims />}
      {tab === "submit" && <SubmitClaim />}
      {tab === "providers" && <Providers />}
      {tab === "eligibility" && <Eligibility />}
    </div>
  );
}
