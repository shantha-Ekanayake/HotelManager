import { createContext, useContext, useState, type ReactNode } from "react";

export const EXCHANGE_RATES: Record<string, number> = {
  LKR: 1,
  USD: 0.0033,
  EUR: 0.0031,
  GBP: 0.0026,
};

export type Currency = "LKR" | "USD" | "EUR" | "GBP";

interface CurrencyContextType {
  targetCurrency: Currency;
  setTargetCurrency: (currency: Currency) => void;
  convertAmount: (amount: number | string) => number;
  formatWithCurrency: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [targetCurrency, setTargetCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem("preferred_currency") as Currency) || "LKR";
  });

  const setTargetCurrency = (currency: Currency) => {
    setTargetCurrencyState(currency);
    localStorage.setItem("preferred_currency", currency);
  };

  const convertAmount = (amount: number | string): number => {
    const raw = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(raw)) return 0;
    return raw * (EXCHANGE_RATES[targetCurrency] || 1);
  };

  const formatWithCurrency = (amount: number | string): string => {
    const raw = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(raw)) {
      if (targetCurrency === "LKR") return "Rs. 0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: targetCurrency,
      }).format(0);
    }
    if (targetCurrency === "LKR") {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        currencyDisplay: "symbol",
      })
        .format(raw)
        .replace("LKR", "Rs.");
    }
    const converted = convertAmount(raw);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: targetCurrency,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider
      value={{ targetCurrency, setTargetCurrency, convertAmount, formatWithCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
