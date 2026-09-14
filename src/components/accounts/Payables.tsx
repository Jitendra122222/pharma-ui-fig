import AgingTable from "./AgingTable";
import { payables } from "./accountsData";

export default function Payables() {
  return <AgingTable data={payables} type="payable" />;
}
