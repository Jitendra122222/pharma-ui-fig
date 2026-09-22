import { useState } from "react";
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
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>HR & Payroll</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Staff directory · Attendance · Payroll · Leave management</div>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />
      {tab === "staff" && <StaffDirectory />}
      {tab === "attendance" && <Attendance />}
      {tab === "payroll" && <Payroll />}
      {tab === "leave" && <Leave />}
    </div>
  );
}
