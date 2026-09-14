import AgingTable from "./AgingTable";
import { receivables } from "./accountsData";

export default function Receivables() {
  return <AgingTable data={receivables} type="receivable" />;
}
