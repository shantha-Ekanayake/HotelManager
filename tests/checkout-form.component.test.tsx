/**
 * Component tests for CheckOutForm success panel.
 *
 * After a successful check-out mutation the component replaces the form with a
 * success panel that contains:
 *   - An Alert with "Check-Out Complete" title
 *   - A "Resend Receipt Email" button
 *   - A "Done" button
 *
 * We shallow-render using React Testing Library with a jsdom environment,
 * mocking every external dependency so no real network or DB calls are made.
 */

// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── mock tanstack react-query ─────────────────────────────────────────────────
const mockMutate = vi.fn();
let mutationOnSuccess: ((data: any) => void) | undefined;

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: {
      reservation: {
        id: "res-1",
        confirmationNumber: "CONF-001",
        guestId: "guest-1",
        roomId: "101",
        arrivalDate: new Date("2026-07-24"),
        departureDate: new Date("2026-07-26"),
        nights: 2,
        totalAmount: "300.00",
        status: "checked_in",
        propertyId: "prop-demo",
      },
      folio: {
        id: "folio-1",
        charges: [{ id: "c1", description: "Room Charge", amount: "300.00" }],
        payments: [{ id: "p1", paymentMethod: "credit_card", amount: "300.00", paymentDate: new Date() }],
      },
    },
    isLoading: false,
  })),
  useMutation: vi.fn((opts: any) => {
    // Capture onSuccess so tests can trigger it
    mutationOnSuccess = opts.onSuccess;
    return {
      mutate: mockMutate,
      isPending: false,
    };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

// ── mock queryClient module ───────────────────────────────────────────────────
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: { invalidateQueries: vi.fn() },
}));

// ── mock toast ────────────────────────────────────────────────────────────────
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── import the component under test ──────────────────────────────────────────
import CheckOutForm from "../client/src/components/CheckOutForm.js";

// ── tests ─────────────────────────────────────────────────────────────────────

describe("CheckOutForm – success panel", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mutationOnSuccess = undefined;
  });

  it("renders the pre-check-out form initially (no success panel)", () => {
    render(<CheckOutForm reservationId="res-1" />);

    // The submit button must be present before check-out
    expect(
      screen.getByTestId("button-complete-checkout")
    ).toBeInTheDocument();

    // Success panel must NOT be visible yet
    expect(
      screen.queryByTestId("button-resend-receipt-email")
    ).not.toBeInTheDocument();
  });

  it("shows the success Alert and Resend button after a successful check-out", async () => {
    render(<CheckOutForm reservationId="res-1" />);

    // Simulate the mutation's onSuccess callback firing (as if the API call
    // completed successfully and returned a reservation object)
    mutationOnSuccess?.({ reservation: { status: "checked_out" } });

    await waitFor(() => {
      expect(
        screen.getByTestId("button-resend-receipt-email")
      ).toBeInTheDocument();
    });

    // Alert heading
    expect(screen.getByText("Check-Out Complete")).toBeInTheDocument();

    // Done button
    expect(screen.getByTestId("button-done-checkout")).toBeInTheDocument();

    // The pre-checkout submit button must be gone
    expect(
      screen.queryByTestId("button-complete-checkout")
    ).not.toBeInTheDocument();
  });

  it("success panel Resend button is enabled (not in loading state) initially", async () => {
    render(<CheckOutForm reservationId="res-1" />);

    mutationOnSuccess?.({ reservation: { status: "checked_out" } });

    await waitFor(() => {
      expect(
        screen.getByTestId("button-resend-receipt-email")
      ).toBeInTheDocument();
    });

    const resendBtn = screen.getByTestId("button-resend-receipt-email");
    expect(resendBtn).not.toBeDisabled();
    expect(resendBtn).toHaveTextContent("Resend Receipt Email");
  });
});
