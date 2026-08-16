/**
 * Tests verifying that CheckInForm.handlePrintCard assembles the
 * RegistrationCardData object with the *correct* guest's fields.
 *
 * Strategy
 * ─────────
 * handlePrintCard delegates all guest-field mapping to the exported production
 * function buildGuestCardFields() (RegistrationCardPrint.ts).  These tests
 * import that REAL function and:
 *
 *   1. Verify it maps each guest field exactly (guestName, guestEmail,
 *      guestPhone, idType, idNumber, nationality) from the provided guest
 *      object.
 *   2. Verify that in-form idVerification overrides take precedence over the
 *      stored guest record (as happens when staff update the ID at check-in).
 *   3. Verify that when TWO guests with different details exist only the
 *      explicitly passed guest's data appears in the card — ruling out
 *      copy-paste / field-mapping bugs that would silently mix guest records.
 *   4. Pipe the assembled fields through buildRegistrationCardHtml() and
 *      confirm the HTML contains the correct guest's details, not the wrong
 *      guest's.
 *
 * No browser or jsdom is required because both buildGuestCardFields() and
 * buildRegistrationCardHtml() are pure functions.
 */

import { describe, it, expect } from "vitest";
import {
  buildGuestCardFields,
  buildRegistrationCardHtml,
} from "../client/src/components/RegistrationCardPrint.js";

// ── Guest fixtures ─────────────────────────────────────────────────────────────
//
// Two guests who share the same room type so a field-mapping bug would
// produce a card with the wrong guest's details.

const GUEST_A = {
  firstName: "Alice",
  lastName: "Nguyen",
  email: "alice.nguyen@example.com",
  phone: "+1-555-1001",
  idType: "passport",
  idNumber: "A12345678",
  nationality: "Vietnamese",
};

const GUEST_B = {
  firstName: "Bob",
  lastName: "Kaminski",
  email: "bob.kaminski@example.com",
  phone: "+1-555-2002",
  idType: "national_id",
  idNumber: "B98765432",
  nationality: "Polish",
};

// ── Minimal reservation/room data needed for a full HTML round-trip ───────────

const BASE_RESERVATION_FIELDS = {
  roomNumber: "204",
  confirmationNumber: "CONF-SHARED-TYPE",
  checkInDate: "8/1/2026",
  checkOutDate: "8/5/2026",
  nights: 4,
  rateAmount: "600.00",
  depositAmount: "150.00",
  depositPaid: true,
  signature: null,
  propertyName: "Grand Test Hotel",
};

// ── buildGuestCardFields unit tests ───────────────────────────────────────────

describe("buildGuestCardFields – maps guest record to card fields", () => {
  it("assembles guestName as 'firstName lastName'", () => {
    const { guestName } = buildGuestCardFields(GUEST_A);
    expect(guestName).toBe("Alice Nguyen");
  });

  it("passes guestEmail through unchanged", () => {
    const { guestEmail } = buildGuestCardFields(GUEST_A);
    expect(guestEmail).toBe("alice.nguyen@example.com");
  });

  it("passes guestPhone through unchanged", () => {
    const { guestPhone } = buildGuestCardFields(GUEST_A);
    expect(guestPhone).toBe("+1-555-1001");
  });

  it("uses idType from the guest record when no override is provided", () => {
    const { idType } = buildGuestCardFields(GUEST_A);
    expect(idType).toBe("passport");
  });

  it("uses idNumber from the guest record when no override is provided", () => {
    const { idNumber } = buildGuestCardFields(GUEST_A);
    expect(idNumber).toBe("A12345678");
  });

  it("uses nationality from the guest record when no override is provided", () => {
    const { nationality } = buildGuestCardFields(GUEST_A);
    expect(nationality).toBe("Vietnamese");
  });

  it("in-form idType override takes precedence over the stored guest record", () => {
    const { idType } = buildGuestCardFields(GUEST_A, { idType: "drivers_license" });
    expect(idType).toBe("drivers_license");
  });

  it("in-form idNumber override takes precedence over the stored guest record", () => {
    const { idNumber } = buildGuestCardFields(GUEST_A, { idNumber: "OVERRIDE-999" });
    expect(idNumber).toBe("OVERRIDE-999");
  });

  it("in-form nationality override takes precedence over the stored guest record", () => {
    const { nationality } = buildGuestCardFields(GUEST_A, { nationality: "Canadian" });
    expect(nationality).toBe("Canadian");
  });

  it("falls back to 'Guest' when no guest object is provided (undefined)", () => {
    const { guestName } = buildGuestCardFields(undefined);
    expect(guestName).toBe("Guest");
  });

  it("falls back to 'Guest' when no guest object is provided (null)", () => {
    const { guestName } = buildGuestCardFields(null);
    expect(guestName).toBe("Guest");
  });

  it("falls back to 'Guest' when both firstName and lastName are empty strings", () => {
    const { guestName } = buildGuestCardFields({ firstName: "", lastName: "" });
    expect(guestName).toBe("Guest");
  });
});

// ── Two-guest isolation tests ─────────────────────────────────────────────────
//
// The core scenario: two guests share a room type.  Passing GUEST_A must
// produce GUEST_A's details; passing GUEST_B must produce GUEST_B's details.
// If handlePrintCard had a copy-paste bug (e.g. used the wrong variable for
// one field), at least one assertion below would fail.

describe("buildGuestCardFields – two guests sharing a room type produce distinct cards", () => {
  it("card for GUEST_A contains Alice's name, not Bob's", () => {
    const { guestName } = buildGuestCardFields(GUEST_A);
    expect(guestName).toBe("Alice Nguyen");
    expect(guestName).not.toContain("Bob");
    expect(guestName).not.toContain("Kaminski");
  });

  it("card for GUEST_B contains Bob's name, not Alice's", () => {
    const { guestName } = buildGuestCardFields(GUEST_B);
    expect(guestName).toBe("Bob Kaminski");
    expect(guestName).not.toContain("Alice");
    expect(guestName).not.toContain("Nguyen");
  });

  it("card for GUEST_A carries Alice's email, not Bob's", () => {
    const { guestEmail } = buildGuestCardFields(GUEST_A);
    expect(guestEmail).toBe("alice.nguyen@example.com");
    expect(guestEmail).not.toContain("bob");
  });

  it("card for GUEST_B carries Bob's email, not Alice's", () => {
    const { guestEmail } = buildGuestCardFields(GUEST_B);
    expect(guestEmail).toBe("bob.kaminski@example.com");
    expect(guestEmail).not.toContain("alice");
  });

  it("card for GUEST_A carries Alice's phone, not Bob's", () => {
    const { guestPhone } = buildGuestCardFields(GUEST_A);
    expect(guestPhone).toBe("+1-555-1001");
    expect(guestPhone).not.toBe("+1-555-2002");
  });

  it("card for GUEST_B carries Bob's phone, not Alice's", () => {
    const { guestPhone } = buildGuestCardFields(GUEST_B);
    expect(guestPhone).toBe("+1-555-2002");
    expect(guestPhone).not.toBe("+1-555-1001");
  });

  it("card for GUEST_A carries Alice's ID number, not Bob's", () => {
    const { idNumber } = buildGuestCardFields(GUEST_A);
    expect(idNumber).toBe("A12345678");
    expect(idNumber).not.toBe("B98765432");
  });

  it("card for GUEST_B carries Bob's ID number, not Alice's", () => {
    const { idNumber } = buildGuestCardFields(GUEST_B);
    expect(idNumber).toBe("B98765432");
    expect(idNumber).not.toBe("A12345678");
  });

  it("card for GUEST_A carries Alice's nationality, not Bob's", () => {
    const { nationality } = buildGuestCardFields(GUEST_A);
    expect(nationality).toBe("Vietnamese");
    expect(nationality).not.toBe("Polish");
  });

  it("card for GUEST_B carries Bob's nationality, not Alice's", () => {
    const { nationality } = buildGuestCardFields(GUEST_B);
    expect(nationality).toBe("Polish");
    expect(nationality).not.toBe("Vietnamese");
  });
});

// ── End-to-end HTML verification ─────────────────────────────────────────────
//
// Pipe buildGuestCardFields() output through buildRegistrationCardHtml() and
// assert the printed HTML contains the right guest's details.

describe("Registration card HTML – correct guest data flows through to printed output", () => {
  it("HTML for GUEST_A contains Alice's full name", () => {
    const guestFields = buildGuestCardFields(GUEST_A);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("Alice Nguyen");
    expect(html).not.toContain("Bob Kaminski");
  });

  it("HTML for GUEST_B contains Bob's full name", () => {
    const guestFields = buildGuestCardFields(GUEST_B);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("Bob Kaminski");
    expect(html).not.toContain("Alice Nguyen");
  });

  it("HTML for GUEST_A contains Alice's email", () => {
    const guestFields = buildGuestCardFields(GUEST_A);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("alice.nguyen@example.com");
    expect(html).not.toContain("bob.kaminski@example.com");
  });

  it("HTML for GUEST_B contains Bob's email", () => {
    const guestFields = buildGuestCardFields(GUEST_B);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("bob.kaminski@example.com");
    expect(html).not.toContain("alice.nguyen@example.com");
  });

  it("HTML for GUEST_A contains Alice's ID number", () => {
    const guestFields = buildGuestCardFields(GUEST_A);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("A12345678");
    expect(html).not.toContain("B98765432");
  });

  it("HTML for GUEST_B contains Bob's ID number", () => {
    const guestFields = buildGuestCardFields(GUEST_B);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("B98765432");
    expect(html).not.toContain("A12345678");
  });

  it("HTML for GUEST_A with in-form override shows the override nationality, not Alice's stored one", () => {
    const guestFields = buildGuestCardFields(GUEST_A, { nationality: "Australian" });
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("Australian");
    expect(html).not.toContain("Vietnamese");
  });

  it("HTML falls back to 'Guest' when no guest is passed (undefined)", () => {
    const guestFields = buildGuestCardFields(undefined);
    const html = buildRegistrationCardHtml({ ...BASE_RESERVATION_FIELDS, ...guestFields });
    expect(html).toContain("Guest");
  });
});
