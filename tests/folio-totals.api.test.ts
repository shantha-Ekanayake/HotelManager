import { describe, expect, it, vi } from "vitest";
import type { Charge, Payment } from "../shared/schema";

vi.mock("../server/db", () => ({ db: {} }));

import { DatabaseStorage } from "../server/database-storage";
import { memStorage } from "../server/mem-storage";

const charge = (totalAmount: string, isVoided = false) =>
  ({ totalAmount, isVoided }) as Charge;
const payment = (amount: string, status: Payment["status"], refundAmount: string | null = null) =>
  ({ amount, status, refundAmount }) as Payment;

describe("stored folio totals", () => {
  const expected = {
    totalCharges: "0.60",
    totalPayments: "0.30",
    balance: "0.30",
  };
  const charges = [charge("0.10"), charge("0.20"), charge("0.30"), charge("9.99", true)];
  const payments = [
    payment("0.10", "completed"),
    payment("0.20", "completed"),
    payment("0.30", "refunded", "0.30"),
    payment("0.40", "pending"),
    payment("0.50", "failed"),
  ];

  it("persists exact totals when database storage recomputes a folio", async () => {
    const storage = new DatabaseStorage();
    vi.spyOn(storage, "getFolio").mockResolvedValue({ id: "folio-test" } as Awaited<ReturnType<typeof storage.getFolio>>);
    vi.spyOn(storage, "getChargesByFolio").mockResolvedValue(charges);
    vi.spyOn(storage, "getPaymentsByFolio").mockResolvedValue(payments);
    const update = vi.spyOn(storage, "updateFolio").mockResolvedValue({} as Awaited<ReturnType<typeof storage.updateFolio>>);

    await storage["recomputeFolioTotals"]("folio-test");
    expect(update).toHaveBeenCalledWith("folio-test", expected);

    // A partial refund retains only the unrefunded cents.
    payments[2] = payment("0.30", "refunded", "0.10");
    await storage["recomputeFolioTotals"]("folio-test");
    expect(update).toHaveBeenLastCalledWith("folio-test", {
      totalCharges: "0.60",
      totalPayments: "0.50",
      balance: "0.10",
    });
  });

  it("persists exact balances in memory after charges, payments and partial refunds", async () => {
    const folio = await memStorage.createFolio({
      reservationId: "test-decimal-reservation",
      guestId: "test-decimal-guest",
      propertyId: "prop-demo",
    });
    for (const amount of ["0.10", "0.20", "0.30"]) {
      await memStorage.createCharge({
        folioId: folio.id,
        chargeCode: "test",
        description: "Decimal charge",
        amount,
        totalAmount: amount,
        taxAmount: "0",
      });
    }
    const first = await memStorage.createPayment({
      folioId: folio.id,
      amount: "0.10",
      paymentMethod: "cash",
      status: "completed",
    });
    await memStorage.createPayment({
      folioId: folio.id,
      amount: "0.20",
      paymentMethod: "cash",
      status: "completed",
    });
    const refunded = await memStorage.createPayment({
      folioId: folio.id,
      amount: "0.30",
      paymentMethod: "cash",
      status: "completed",
    });
    await memStorage.createPayment({
      folioId: folio.id,
      amount: "0.40",
      paymentMethod: "cash",
      status: "pending",
    });
    expect(await memStorage.getFolio(folio.id)).toMatchObject({
      totalCharges: "0.60", totalPayments: "0.60", balance: "0.00",
    });

    await memStorage.updatePayment(refunded.id, { status: "refunded", refundAmount: "0.10" } as any);
    expect(await memStorage.getFolio(folio.id)).toMatchObject({
      totalCharges: "0.60", totalPayments: "0.50", balance: "0.10",
    });
    expect(await memStorage.calculateFolioBalance(folio.id)).toEqual({
      totalCharges: 0.6, totalPayments: 0.5, balance: 0.1,
    });
    await memStorage.updatePayment(refunded.id, { refundAmount: "0.30" } as any);
    expect(await memStorage.getFolio(folio.id)).toMatchObject(expected);
    await memStorage.updatePayment(first.id, { status: "failed" });
    expect(await memStorage.getFolio(folio.id)).toMatchObject({
      totalCharges: "0.60", totalPayments: "0.20", balance: "0.40",
    });
  });
});