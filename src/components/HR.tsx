import { useState } from "react";
import { S } from "../styles/common";
import { TabBar } from "./shared/TabBar";
import { SubTab, TABS } from "./hr/hrData";
import StaffDirectory from "./hr/StaffDirectory";
import Attendance from "./hr/Attendance";
import Payroll from "./hr/Payroll";
import Leave from "./hr/Leave";

export default function HR() {
  const [tab, setTab] = useState<SubTab>("staff");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={S.pageTitleAlt}>HR & Payroll</h1>
        <div style={S.subtitleMuted}>Staff directory · Attendance · Payroll · Leave management</div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />
      {tab === "staff" && <StaffDirectory />}
      {tab === "attendance" && <Attendance />}
      {tab === "payroll" && <Payroll />}
      {tab === "leave" && <Leave />}
    </div>
  );
}
