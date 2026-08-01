/**
 * Tests for the printReceipt() helper and the two "Print Receipt" buttons
 * in CheckOutForm (form-level and post-checkout-success panel).
 *
 * Strategy
 * ─────────
 * window.open() is mocked so we capture every write() call made to the
 * popup document.  After printReceipt() runs we concatenate the captured
 * writes and assert the receipt HTML contains the expected fields.
 *
 * The CheckOutForm tests additionally verify that clicking either button
 * invokes printReceipt() (proxied through the same window.open mock).
 */

// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── printReceipt unit-level mock infrastructure ───────────────────────────────

/** Accumulated HTML written via mockDoc.write() across calls */
let capturedHtml = "";

const mockDoc = {
  write: vi.fn((chunk: string) => { capturedHtml += chunk; }),
  close: vi.fn(),
};

const mockWindow = {
  document: mockDoc,
  focus: vi.fn(),
  print: vi.fn(),
  onload: null as (() => void) | null,
};

// ── window.open mock ──────────────────────────────────────────────────────────

const openSpy = vi.spyOn(window, "open");

function resetWindowMock() {
  capturedHtml = "";
  mockDoc.write.mockClear();
  mockDoc.close.mockClear();
  mockWindow.focus.mockClear();
  mockWindow.print.mockClear();
  mockWindow.onload = null;
  openSpy.mockReturnValue(mockWindow as unknown as Window);
}

// ── tanstack / query client mocks ─────────────────────────────────────────────

const mockMutate = vi.fn();
let mutationOnSuccess: ((data: any) => void) | undefined;

/**
 * Controls what the /api/properties query returns.
 * Set to a properties array before a test; reset to undefined in beforeEach/afterEach.
 * When undefined the mock returns no data for that key, exercising the
 * "propertiesData?.properties?.[0] is undefined" path.
 */
let mockPropertiesResponseData: { properties: any[] } | undefined = undefined;

const DEFAULT_FOLIO_QUERY_DATA = {
  reservation: {
    id: "res-1",
    confirmationNumber: "CONF-9001",
    guestId: "guest-1",
    roomId: "202",
    arrivalDate: new Date("2026-07-20"),
    departureDate: new Date("2026-07-26"),
    nights: 6,
    totalAmount: "900.00",
    status: "checked_in",
    propertyId: "prop-demo",
  },
  folio: {
    id: "folio-1",
    charges: [
      { id: "c1", description: "Room Charge", amount: "750.00" },
      { id: "c2", description: "Mini Bar", amount: "150.00" },
    ],
    payments: [
      {
        id: "p1",
        paymentMethod: "credit_card",
        amount: "900.00",
        paymentDate: new Date("2026-07-26"),
      },
    ],
  },
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((opts: any) => {
    const key = opts?.queryKey?.[0] ?? "";
    if (typeof key === "string" && key.startsWith("/api/guests")) {
      return {
        data: {
          guest: {
            id: "guest-1",
            firstName: "Alice",
            lastName: "Traveler",
            email: "alice@example.com",
          },
        },
        isLoading: false,
      };
    }
    if (typeof key === "string" && key === "/api/properties") {
      return { data: mockPropertiesResponseData, isLoading: false };
    }
    return { data: DEFAULT_FOLIO_QUERY_DATA, isLoading: false };
  }),
  useMutation: vi.fn((opts: any) => {
    mutationOnSuccess = opts.onSuccess;
    return { mutate: mockMutate, isPending: false };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── imports under test ────────────────────────────────────────────────────────

import { printReceipt } from "../client/src/components/ReceiptPrint.js";
import CheckOutForm from "../client/src/components/CheckOutForm.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_RECEIPT_DATA = {
  guestName: "John Doe",
  guestEmail: "john@example.com",
  confirmationNumber: "CONF-1234",
  roomNumber: "101",
  checkInDate: "7/20/2026",
  checkOutDate: "7/26/2026",
  nights: 6,
  charges: [
    { id: "c1", description: "Room Charge", amount: "600.00" },
    { id: "c2", description: "Breakfast", amount: "60.00" },
  ],
  payments: [
    {
      id: "p1",
      paymentMethod: "Visa",
      paymentDate: new Date("2026-07-26"),
      amount: "660.00",
    },
  ],
  totalCharges: 660,
  totalPayments: 660,
  balance: 0,
  propertyName: "Grand Hotel",
};

// ── printReceipt unit tests ───────────────────────────────────────────────────

describe("printReceipt() – HTML content", () => {
  beforeEach(() => {
    resetWindowMock();
  });

  afterEach(() => {
    openSpy.mockReset();
  });

  it("opens a new window with the correct dimensions", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(openSpy).toHaveBeenCalledWith("", "_blank", expect.stringContaining("width=800"));
  });

  it("writes the confirmation number into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("CONF-1234");
  });

  it("writes the guest name into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("John Doe");
  });

  it("writes each charge description into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("Room Charge");
    expect(capturedHtml).toContain("Breakfast");
  });

  it("writes each charge amount into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("Rs 600.00");
    expect(capturedHtml).toContain("Rs 60.00");
  });

  it("writes the payment method into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("Visa");
  });

  it("writes the total charges into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    // totalCharges = 660
    expect(capturedHtml).toContain("Rs 660.00");
  });

  it("writes the balance into the receipt HTML", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    // balance = 0 → "Balance" label (not "Balance Due")
    expect(capturedHtml).toContain("Balance");
    expect(capturedHtml).toContain("Rs 0.00");
  });

  it("labels balance as 'Balance Due' when the guest owes money", () => {
    printReceipt({ ...SAMPLE_RECEIPT_DATA, balance: 50, totalPayments: 610 });
    expect(capturedHtml).toContain("Balance Due");
  });

  it("prints the correct outstanding amount when the guest has a partial payment", () => {
    // charges: 660, payments: 610 → balance: 50
    printReceipt({ ...SAMPLE_RECEIPT_DATA, balance: 50, totalPayments: 610 });
    expect(capturedHtml).toContain("Rs 50.00");
  });

  it("does NOT show 'Balance Due' (only 'Balance') when the folio is fully paid", () => {
    // SAMPLE_RECEIPT_DATA has balance: 0 – the label must be plain "Balance"
    printReceipt(SAMPLE_RECEIPT_DATA);
    // The HTML must not contain the string "Balance Due"
    expect(capturedHtml).not.toContain("Balance Due");
  });

  it("applies the red balance-due class on the totals row for a partial payment", () => {
    // charges: 660, payments: 610 → balance: 50 → class="balance-due"
    printReceipt({ ...SAMPLE_RECEIPT_DATA, balance: 50, totalPayments: 610 });
    expect(capturedHtml).toContain('class="balance-due"');
  });

  it("applies the balance-clear class (not balance-due) when the folio is fully settled", () => {
    // balance: 0 → class="balance-clear"
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain('class="balance-clear"');
    expect(capturedHtml).not.toContain('class="balance-due"');
  });

  it("includes the property name in the header", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("Grand Hotel");
  });

  it("includes 'Departure Receipt' as the document title", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(capturedHtml).toContain("Departure Receipt");
  });

  it("calls document.close() after writing", () => {
    printReceipt(SAMPLE_RECEIPT_DATA);
    expect(mockDoc.close).toHaveBeenCalled();
  });

  it("shows 'No charges recorded' when charges array is empty", () => {
    printReceipt({ ...SAMPLE_RECEIPT_DATA, charges: [] });
    expect(capturedHtml).toContain("No charges recorded");
  });

  it("shows 'No payments recorded' when payments array is empty", () => {
    printReceipt({ ...SAMPLE_RECEIPT_DATA, payments: [] });
    expect(capturedHtml).toContain("No payments recorded");
  });

  it("shows an alert and does NOT throw when window.open returns null (pop-up blocked)", () => {
    openSpy.mockReturnValueOnce(null);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    expect(() => printReceipt(SAMPLE_RECEIPT_DATA)).not.toThrow();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("pop-ups"));
    alertSpy.mockRestore();
  });

  it("HTML-escapes special characters in guest name", () => {
    printReceipt({ ...SAMPLE_RECEIPT_DATA, guestName: '<script>alert("xss")</script>' });
    expect(capturedHtml).not.toContain("<script>");
    expect(capturedHtml).toContain("&lt;script&gt;");
  });

  it("renders the nights field when provided", () => {
    printReceipt(SAMPLE_RECEIPT_DATA); // nights: 6
    expect(capturedHtml).toContain("Nights");
    expect(capturedHtml).toContain("6");
  });

  it("omits the nights field when nights is null", () => {
    printReceipt({ ...SAMPLE_RECEIPT_DATA, nights: null });
    // "Nights" label should not appear in the stay-details section
    // (it may still appear in the HTML entity set, so test the field-label wrapper)
    expect(capturedHtml).not.toContain("field-label\">Nights");
  });
});

// ── CheckOutForm – form-level "Print Receipt" button ─────────────────────────

describe("CheckOutForm – form-level Print Receipt button", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mutationOnSuccess = undefined;
    mockPropertiesResponseData = undefined;
    resetWindowMock();
  });

  afterEach(() => {
    mockPropertiesResponseData = undefined;
    openSpy.mockReset();
  });

  it("renders the form-level Print Receipt button before check-out", () => {
    render(<CheckOutForm reservationId="res-1" />);
    expect(screen.getByTestId("button-print-receipt")).toBeInTheDocument();
  });

  it("opens a new window when the form-level Print Receipt button is clicked", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(openSpy).toHaveBeenCalledWith("", "_blank", expect.stringContaining("width=800"));
  });

  it("includes the confirmation number in the receipt HTML (form-level button)", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("CONF-9001");
  });

  it("includes the guest name in the receipt HTML (form-level button)", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("Alice");
    expect(capturedHtml).toContain("Traveler");
  });

  it("includes charge descriptions in the receipt HTML (form-level button)", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("Room Charge");
    expect(capturedHtml).toContain("Mini Bar");
  });

  it("includes the payment method in the receipt HTML (form-level button)", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("credit_card");
  });

  it("includes the balance in the receipt HTML (form-level button)", () => {
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    // total charges 900, total payments 900 → balance 0
    expect(capturedHtml).toContain("Rs 0.00");
  });
});

// ── CheckOutForm – post-checkout success panel "Print Receipt" button ─────────

describe("CheckOutForm – success-panel Print Receipt button", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mutationOnSuccess = undefined;
    mockPropertiesResponseData = undefined;
    resetWindowMock();
  });

  afterEach(() => {
    mockPropertiesResponseData = undefined;
    openSpy.mockReset();
  });

  async function renderAndCheckOut(emailStatus?: string) {
    render(<CheckOutForm reservationId="res-1" />);
    mutationOnSuccess?.({ reservation: { status: "checked_out" }, emailStatus });
    await waitFor(() =>
      expect(screen.getByTestId("button-print-receipt-success")).toBeInTheDocument()
    );
  }

  it("renders the success-panel Print Receipt button after check-out", async () => {
    await renderAndCheckOut();
    expect(screen.getByTestId("button-print-receipt-success")).toBeInTheDocument();
  });

  it("opens a new window when the success-panel Print Receipt button is clicked", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(openSpy).toHaveBeenCalledWith("", "_blank", expect.stringContaining("width=800"));
  });

  it("includes the confirmation number in the receipt HTML (success-panel button)", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("CONF-9001");
  });

  it("includes the guest name in the receipt HTML (success-panel button)", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("Alice");
    expect(capturedHtml).toContain("Traveler");
  });

  it("includes charge rows in the receipt HTML (success-panel button)", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("Room Charge");
    expect(capturedHtml).toContain("Mini Bar");
  });

  it("includes payment rows in the receipt HTML (success-panel button)", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("credit_card");
  });

  it("includes the final balance in the receipt HTML (success-panel button)", async () => {
    await renderAndCheckOut();
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("Rs 0.00");
  });

  it("success-panel Print Receipt button is still present when emailStatus is 'failed'", async () => {
    await renderAndCheckOut("failed");
    expect(screen.getByTestId("button-print-receipt-success")).toBeInTheDocument();
  });
});

// ── CheckOutForm – property name / address in receipt ────────────────────────
//
// These tests verify the core contract: when /api/properties returns a real
// property the printed receipt header must contain that property's name and
// address, NOT the hard-coded placeholder "Hotel Management System".

describe("CheckOutForm – receipt uses real property name and address from /api/properties", () => {
  const REAL_PROPERTY = {
    id: "prop-1",
    name: "Sunset Palace Hotel",
    address: "12 Ocean Drive",
    city: "Malibu",
    state: "CA",
    country: "US",
    postalCode: "90265",
    phone: "+1-310-555-0199",
  };

  beforeEach(() => {
    mockMutate.mockReset();
    mutationOnSuccess = undefined;
    mockPropertiesResponseData = undefined;
    resetWindowMock();
  });

  afterEach(() => {
    mockPropertiesResponseData = undefined;
    openSpy.mockReset();
  });

  // ── form-level button ──────────────────────────────────────────────────────

  it("form-level button: receipt header contains the real property name", () => {
    mockPropertiesResponseData = { properties: [REAL_PROPERTY] };
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("Sunset Palace Hotel");
  });

  it("form-level button: receipt header does NOT contain the placeholder when a real property is provided", () => {
    mockPropertiesResponseData = { properties: [REAL_PROPERTY] };
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).not.toContain("Hotel Management System");
  });

  it("form-level button: receipt header contains the assembled property address", () => {
    mockPropertiesResponseData = { properties: [REAL_PROPERTY] };
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    // The address is joined from address + city + state + country + postalCode
    expect(capturedHtml).toContain("12 Ocean Drive");
    expect(capturedHtml).toContain("Malibu");
  });

  it("form-level button: receipt header contains the property phone number", () => {
    mockPropertiesResponseData = { properties: [REAL_PROPERTY] };
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("+1-310-555-0199");
  });

  it("form-level button: falls back to the placeholder when /api/properties returns no properties", () => {
    mockPropertiesResponseData = { properties: [] };
    render(<CheckOutForm reservationId="res-1" />);
    fireEvent.click(screen.getByTestId("button-print-receipt"));
    expect(capturedHtml).toContain("Hotel Management System");
  });

  // ── success-panel button ───────────────────────────────────────────────────

  async function renderAndCheckOutWithProperty(property?: typeof REAL_PROPERTY) {
    mockPropertiesResponseData = property ? { properties: [property] } : { properties: [] };
    render(<CheckOutForm reservationId="res-1" />);
    mutationOnSuccess?.({ reservation: { status: "checked_out" }, emailStatus: "sent" });
    await waitFor(() =>
      expect(screen.getByTestId("button-print-receipt-success")).toBeInTheDocument()
    );
  }

  it("success-panel button: receipt header contains the real property name", async () => {
    await renderAndCheckOutWithProperty(REAL_PROPERTY);
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("Sunset Palace Hotel");
  });

  it("success-panel button: receipt header does NOT contain the placeholder when a real property is provided", async () => {
    await renderAndCheckOutWithProperty(REAL_PROPERTY);
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).not.toContain("Hotel Management System");
  });

  it("success-panel button: receipt header contains the assembled property address", async () => {
    await renderAndCheckOutWithProperty(REAL_PROPERTY);
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("12 Ocean Drive");
    expect(capturedHtml).toContain("Malibu");
  });

  it("success-panel button: falls back to the placeholder when /api/properties returns no properties", async () => {
    await renderAndCheckOutWithProperty(undefined);
    fireEvent.click(screen.getByTestId("button-print-receipt-success"));
    expect(capturedHtml).toContain("Hotel Management System");
  });
});
