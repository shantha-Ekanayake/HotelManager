import type { Charge, Payment } from "@shared/schema";

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

function toCents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error(`Invalid currency amount: ${value}`);
  const cents = BigInt(match[2]) * HUNDRED + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

function asCurrency(cents: bigint): string {
  const sign = cents < ZERO ? "-" : "";
  const absolute = cents < ZERO ? -cents : cents;
  return `${sign}${absolute / HUNDRED}.${(absolute % HUNDRED).toString().padStart(2, "0")}`;
}

export function calculateFolioTotals(
  charges: Pick<Charge, "totalAmount" | "isVoided">[],
  payments: Pick<Payment, "amount" | "refundAmount" | "status">[],
): { totalCharges: string; totalPayments: string; balance: string } {
  const chargeCents = charges.reduce(
    (sum, charge) => sum + (charge.isVoided ? ZERO : toCents(charge.totalAmount)),
    ZERO,
  );
  const paymentCents = payments.reduce((sum, payment) => {
    if (payment.status === "completed") return sum + toCents(payment.amount);
    if (payment.status === "refunded") {
      const net = toCents(payment.amount) - toCents(payment.refundAmount ?? "0");
      return sum + (net > ZERO ? net : ZERO);
    }
    return sum;
  }, ZERO);
  return {
    totalCharges: asCurrency(chargeCents),
    totalPayments: asCurrency(paymentCents),
    balance: asCurrency(chargeCents - paymentCents),
  };
}