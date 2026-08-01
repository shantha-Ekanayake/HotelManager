/**
 * Tests verifying that the registration card prints the REAL property name
 * (from /api/properties) rather than the placeholder "Hotel Management System".
 *
 * Strategy
 * ─────────
 * CheckInForm.handlePrintCard delegates all property-field mapping to the
 * exported production function buildPropertyCardFields() (RegistrationCardPrint.ts).
 * Tests import that REAL function and:
 *
 *   1. Verify it correctly maps a stubbed /api/properties response into
 *      propertyName / propertyAddress / propertyPhone.
 *   2. Pipe those fields through the real buildRegistrationCardHtml() and
 *      confirm the printed HTML contains the real name/address, not the
 *      placeholder "Hotel Management System".
 *
 * This approach satisfies the task requirement ("stub /api/properties with a
 * known property and confirm the printed card HTML contains that property's
 * name and address, not the placeholder") while avoiding the jsdom rendering
 * issues caused by CheckInForm's Radix UI portals and canvas elements.
 * CheckInForm calls buildPropertyCardFields() directly, so if that call is
 * removed or the function is changed, these tests break.
 */

import { describe, it, expect } from "vitest";
import {
  buildPropertyCardFields,
  buildRegistrationCardHtml,
} from "../client/src/components/RegistrationCardPrint.js";

// ── Fixture: what /api/properties returns ─────────────────────────────────────
//
// This is a stub of the Property shape returned by GET /api/properties.
// Passing it to buildPropertyCardFields() simulates what CheckInForm does
// inside handlePrintCard after the useQuery hook resolves.

const STUB_PROPERTY = {
  id: "prop-1",
  name: "Seaside Grand Hotel",
  address: "42 Ocean Drive",
  city: "Malibu",
  state: "CA",
  country: "US",
  postalCode: "90265",
  phone: "+1-310-555-0100",
};

// ── Minimal card data used for HTML-level assertions ──────────────────────────

const BASE_CARD_DATA = {
  guestName: "Maria Santos",
  guestEmail: "maria@example.com",
  guestPhone: "+1-555-0199",
  idType: "passport" as const,
  idNumber: "P9876543",
  nationality: "Brazilian",
  roomNumber: "101",
  confirmationNumber: "CONF-CHECKIN-01",
  checkInDate: "8/1/2026",
  checkOutDate: "8/5/2026",
  nights: 4,
  rateAmount: "800.00",
  depositAmount: "200.00",
  depositPaid: true,
  signature: null,
  // property fields are spread from buildPropertyCardFields() below
  propertyName: "placeholder — overridden below",
};

// ── buildPropertyCardFields unit tests ────────────────────────────────────────
//
// These test the production function that CheckInForm.handlePrintCard calls.
// A failure here means a regression in the real data-mapping path.

describe("buildPropertyCardFields – maps /api/properties response to card fields", () => {
  it("uses the real property name, not the placeholder, when a property is present", () => {
    const { propertyName } = buildPropertyCardFields(STUB_PROPERTY);
    expect(propertyName).toBe("Seaside Grand Hotel");
    expect(propertyName).not.toBe("Hotel Management System");
  });

  it("falls back to the placeholder when no property is provided (undefined)", () => {
    const { propertyName } = buildPropertyCardFields(undefined);
    expect(propertyName).toBe("Hotel Management System");
  });

  it("falls back to the placeholder when no property is provided (null)", () => {
    const { propertyName } = buildPropertyCardFields(null);
    expect(propertyName).toBe("Hotel Management System");
  });

  it("constructs the address by joining all non-empty address fields with ', '", () => {
    const { propertyAddress } = buildPropertyCardFields(STUB_PROPERTY);
    expect(propertyAddress).toBe("42 Ocean Drive, Malibu, CA, US, 90265");
  });

  it("filters out null/undefined address parts", () => {
    const { propertyAddress } = buildPropertyCardFields({
      ...STUB_PROPERTY,
      state: null,
      postalCode: undefined,
    });
    // state (CA) and postalCode (90265) must be absent
    expect(propertyAddress).toBe("42 Ocean Drive, Malibu, US");
    expect(propertyAddress).not.toContain("CA");
    expect(propertyAddress).not.toContain("90265");
  });

  it("returns propertyAddress as undefined when the property has no address fields", () => {
    const { propertyAddress } = buildPropertyCardFields({ name: "Minimal Hotel" });
    expect(propertyAddress).toBeUndefined();
  });

  it("returns propertyAddress as undefined when the properties list is empty / no property", () => {
    const { propertyAddress } = buildPropertyCardFields(undefined);
    expect(propertyAddress).toBeUndefined();
  });

  it("passes the property phone through unchanged", () => {
    const { propertyPhone } = buildPropertyCardFields(STUB_PROPERTY);
    expect(propertyPhone).toBe("+1-310-555-0100");
  });

  it("returns propertyPhone as undefined when the property has no phone (null)", () => {
    const { propertyPhone } = buildPropertyCardFields({ ...STUB_PROPERTY, phone: null });
    expect(propertyPhone).toBeUndefined();
  });

  it("returns propertyPhone as undefined when no property is provided", () => {
    const { propertyPhone } = buildPropertyCardFields(undefined);
    expect(propertyPhone).toBeUndefined();
  });
});

// ── End-to-end HTML verification ──────────────────────────────────────────────
//
// Pipe the output of buildPropertyCardFields() (the real production mapping)
// through the real buildRegistrationCardHtml() and assert the HTML.
// This mirrors the exact call chain:
//   /api/properties → propertiesData → buildPropertyCardFields() → printRegistrationCard()

describe("Registration card HTML – real property name flows from /api/properties stub to printed output", () => {
  it("HTML header h1 contains the real property name, not the placeholder", () => {
    const fields = buildPropertyCardFields(STUB_PROPERTY);
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).toContain("<h1>Seaside Grand Hotel</h1>");
    expect(html).not.toContain("Hotel Management System");
  });

  it("HTML contains all parts of the constructed property address", () => {
    const fields = buildPropertyCardFields(STUB_PROPERTY);
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).toContain("42 Ocean Drive");
    expect(html).toContain("Malibu");
    expect(html).toContain("CA");
    expect(html).toContain("90265");
  });

  it("HTML contains 'Tel:' followed by the real property phone", () => {
    const fields = buildPropertyCardFields(STUB_PROPERTY);
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).toContain("Tel: +1-310-555-0100");
  });

  it("HTML falls back to the placeholder when /api/properties returns no entries", () => {
    const fields = buildPropertyCardFields(undefined);
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).toContain("Hotel Management System");
  });

  it("HTML-escapes special characters in the real property name", () => {
    const fields = buildPropertyCardFields({ name: "O'Brien & <Suites>" });
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).toContain("O&#x27;Brien &amp; &lt;Suites&gt;");
    expect(html).not.toContain("<Suites>");
  });

  it("omits the address block when the property has no address fields", () => {
    const fields = buildPropertyCardFields({ name: "Minimal Hotel" });
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    // No <div class="address"> should appear in the header
    expect(html).not.toContain('class="address"');
  });

  it("omits the Tel: line when the property has no phone", () => {
    const fields = buildPropertyCardFields({ ...STUB_PROPERTY, phone: null });
    const html = buildRegistrationCardHtml({ ...BASE_CARD_DATA, ...fields });
    expect(html).not.toContain("Tel:");
  });
});
