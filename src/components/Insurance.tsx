import { useState } from "react";
import { S } from "../styles/common";
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
        <h1 style={S.pageTitleAlt}>Insurance & Claims</h1>
        <div style={S.subtitleMuted}>Claims management · Provider contracts · Eligibility verification</div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />
      {tab === "claims" && <Claims />}
      {tab === "submit" && <SubmitClaim />}
      {tab === "providers" && <Providers />}
      {tab === "eligibility" && <Eligibility />}
    </div>
  );
}
