import { createContext, useContext, useState, ReactNode } from "react";

export type PrinterType = "Laser" | "DOT" | "Thermal";

export interface PrinterSettings {
  enabled: boolean;
  connected: boolean;
  printerType: PrinterType;
  printerName: string;
}

interface PrinterContextValue {
  settings: PrinterSettings;
  updateSettings: (patch: Partial<PrinterSettings>) => void;
}

const DEFAULT: PrinterSettings = {
  enabled: true,
  connected: true,
  printerType: "Laser",
  printerName: "HP LaserJet Pro M404",
};

const PrinterContext = createContext<PrinterContextValue>({
  settings: DEFAULT,
  updateSettings: () => {},
});

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT);
  const updateSettings = (patch: Partial<PrinterSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));
  return (
    <PrinterContext.Provider value={{ settings, updateSettings }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinterSettings() {
  return useContext(PrinterContext);
}
