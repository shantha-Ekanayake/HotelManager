/**
 * Component-level tests for the communications tab in the Guests page.
 *
 * Strategy
 * ─────────
 * Mock @tanstack/react-query so we can control exactly what data each useQuery
 * call returns without hitting a real server.  We render the full Guests page,
 * click a guest card to select it, then click the "Comms" tab and assert:
 *
 *   1. When the API returns an empty array the component shows
 *      data-testid="text-no-communications" ("No communications logged").
 *
 *   2. When the API returns a communication whose subject contains "[FAILED]"
 *      the component renders data-testid="badge-failed-<id>" (the red
 *      "Failed" badge).
 */

// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── base guest fixture shared by both scenarios ───────────────────────────────

const DEMO_GUEST = {
  id: "guest-comms-test",
  firstName: "Comms",
  lastName: "Tester",
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  country: null,
  postalCode: null,
  idType: null,
  idNumber: null,
  nationality: null,
  preferences: {},
  vipStatus: false,
  blacklistStatus: false,
  blacklistReason: null,
  loyaltyTier: "none",
  loyaltyPoints: 0,
  segment: "leisure",
  tags: [],
  notes: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const DEMO_PROFILE = {
  profile: {
    totalStays: 0,
    totalRevenue: 0,
    totalSpent: "0.00",
    averageStayDuration: 0,
    lastStayDate: null,
    stayHistory: [],
    preferences: {},
  },
};

// ── mutable slot for communications — tests swap this before each render ──────

let communicationsPayload: { communications: any[] } = { communications: [] };

// ── mock @tanstack/react-query ────────────────────────────────────────────────

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((opts: any) => {
    const key: string = Array.isArray(opts?.queryKey)
      ? opts.queryKey.join("/")
      : String(opts?.queryKey ?? "");

    if (key.includes("all")) {
      return { data: { guests: [DEMO_GUEST] }, isLoading: false };
    }
    if (key.includes("profile")) {
      return { data: DEMO_PROFILE, isLoading: false };
    }
    if (key.includes("communications")) {
      return { data: communicationsPayload, isLoading: false };
    }
    return { data: null, isLoading: false };
  }),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── mock Radix UI Tabs so all TabsContent panels are always mounted ─────────────
// Radix UI Tabs removes inactive panel content from the DOM by default; in
// jsdom that makes testing a specific tab panel impossible without simulating
// the full pointer-event chain.  The mock below replaces the Tabs primitives
// with simple <div> wrappers that always render their children so assertions
// against data-testid attributes inside any panel work as expected.

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button data-value={value} {...props}>{children}</button>
  ),
  TabsContent: ({ children, value, ...props }: any) => (
    <div data-panel={value} {...props}>{children}</div>
  ),
}));

// ── component under test ──────────────────────────────────────────────────────

import Guests from "../client/src/pages/Guests.js";

// ── helpers ───────────────────────────────────────────────────────────────────

async function renderAndSelectGuest() {
  render(<Guests />);

  // Click the guest card to select the guest and reveal the detail panel.
  // Because the Tabs component is mocked to always render all panel content,
  // no further tab-click navigation is required.
  const guestCard = await screen.findByTestId(`card-guest-${DEMO_GUEST.id}`);
  fireEvent.click(guestCard);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Guests communications tab — empty state", () => {
  beforeEach(() => {
    communicationsPayload = { communications: [] };
  });

  it("shows the 'No communications logged' empty-state when there are no records", async () => {
    await renderAndSelectGuest();

    await waitFor(() => {
      expect(
        screen.getByTestId("text-no-communications")
      ).toBeInTheDocument();
    });
  });

  it("does NOT render any communication card when the list is empty", async () => {
    await renderAndSelectGuest();

    await waitFor(() => {
      // There should be no card-communication-* elements at all
      const cards = document.querySelectorAll('[data-testid^="card-communication-"]');
      expect(cards.length).toBe(0);
    });
  });
});

describe("Guests communications tab — FAILED entry", () => {
  const FAILED_COMM = {
    id: "comm-failed-1",
    guestId: DEMO_GUEST.id,
    type: "email",
    direction: "outbound",
    subject: "Check-in confirmation [FAILED]",
    content: "Email delivery failed: invalid address.",
    staffId: null,
    createdAt: "2026-07-01T10:00:00Z",
  };

  beforeEach(() => {
    communicationsPayload = { communications: [FAILED_COMM] };
  });

  it("renders the communication card for the FAILED entry", async () => {
    await renderAndSelectGuest();

    await waitFor(() => {
      expect(
        screen.getByTestId(`card-communication-${FAILED_COMM.id}`)
      ).toBeInTheDocument();
    });
  });

  it("shows the red 'Failed' badge on a communication with [FAILED] in the subject", async () => {
    await renderAndSelectGuest();

    await waitFor(() => {
      expect(
        screen.getByTestId(`badge-failed-${FAILED_COMM.id}`)
      ).toBeInTheDocument();
    });
  });

  it("does NOT show the empty-state message when there is at least one communication", async () => {
    await renderAndSelectGuest();

    await waitFor(() => {
      expect(
        screen.queryByTestId("text-no-communications")
      ).not.toBeInTheDocument();
    });
  });
});
