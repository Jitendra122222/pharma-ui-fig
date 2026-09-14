import { useEffect, useState } from "react";

const MODULE_MESSAGES: Record<string, string[]> = {
  dashboard:     ["Loading KPI tiles…", "Fetching revenue data…", "Building analytics charts…", "Almost there…"],
  inventory:     ["Loading drug catalog…", "Fetching stock levels…", "Syncing batch data…", "Almost there…"],
  stock:         ["Loading stock movements…", "Fetching batch records…", "Syncing warehouse data…", "Almost there…"],
  shortbook:     ["Loading short book…", "Checking low-stock items…", "Syncing reorder list…", "Almost there…"],
  expiry:        ["Loading expiry data…", "Scanning batch dates…", "Flagging near-expiry stock…", "Almost there…"],
  sales:         ["Loading sales invoices…", "Fetching payment records…", "Syncing counter sales…", "Almost there…"],
  prescriptions: ["Loading Rx queue…", "Fetching prescription records…", "Syncing dispensing data…", "Almost there…"],
  patients:      ["Loading patient records…", "Fetching visit history…", "Syncing prescriptions…", "Almost there…"],
  purchases:     ["Loading purchase orders…", "Fetching GRN records…", "Syncing supplier invoices…", "Almost there…"],
  suppliers:     ["Loading supplier list…", "Fetching contact details…", "Syncing purchase history…", "Almost there…"],
  accounts:      ["Loading chart of accounts…", "Fetching ledger entries…", "Syncing receivables…", "Almost there…"],
  insurance:     ["Loading claims data…", "Fetching provider details…", "Syncing eligibility records…", "Almost there…"],
  reports:       ["Loading revenue charts…", "Crunching sales analytics…", "Generating Rx trends…", "Almost there…"],
  hr:            ["Loading staff directory…", "Fetching payroll data…", "Syncing attendance records…", "Almost there…"],
  settings:      ["Loading preferences…", "Fetching system config…", "Applying user roles…", "Almost there…"],
};

const LOGIN_MESSAGES = [
  "Preparing your workspace…",
  "Syncing inventory ledger…",
  "Loading batches & stock…",
  "Almost there…",
];

interface Props {
  exiting?: boolean;
  module?: string;
}

export default function LoadingScreen({ exiting = false, module }: Props) {
  const messages = module ? (MODULE_MESSAGES[module] ?? LOGIN_MESSAGES) : LOGIN_MESSAGES;

  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setMsgIdx(0);
    setFade(true);
  }, [module]);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        setFade(true);
      }, 250);
    }, 1800);
    return () => clearInterval(id);
  }, [messages]);

  return (
    <div className={`ls-stage${exiting ? " ls-exiting" : ""}`}>
      <div className="ls-field" aria-hidden="true">
        <span /><span /><span />
        <span /><span /><span />
      </div>

      <div className="ls-logo-stage" aria-hidden="true">
        <img className="ls-logo-img" src="/favicon.png" alt="" />
      </div>

      <div className="ls-brand">
        <div className="ls-status">
          <span style={{ opacity: fade ? 1 : 0, transition: "opacity 250ms ease" }}>
            {messages[msgIdx]}
          </span>
        </div>
      </div>
    </div>
  );
}
