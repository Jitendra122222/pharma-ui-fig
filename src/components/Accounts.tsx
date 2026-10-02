import { useState } from "react";
import { S } from "../styles/common";
import { TabBar } from "./shared/TabBar";
import { SubTab, TABS } from "./accounts/accountsData";
import AccountsOverview from "./accounts/AccountsOverview";
import Ledger from "./accounts/Ledger";
import Journal from "./accounts/Journal";
import Receivables from "./accounts/Receivables";
import Payables from "./accounts/Payables";

export default function Accounts() {
  const [tab, setTab] = useState<SubTab>("overview");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={S.pageTitleAlt}>Accounts & Finance</h1>
        <div style={S.subtitleMuted}>Chart of accounts · Ledger · Journal · Receivables · Payables</div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />
      {tab === "overview" && <AccountsOverview />}
      {tab === "ledger" && <Ledger />}
      {tab === "journal" && <Journal />}
      {tab === "receivables" && <Receivables />}
      {tab === "payables" && <Payables />}
    </div>
  );
}
