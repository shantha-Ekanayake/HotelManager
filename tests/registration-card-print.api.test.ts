/**
 * Unit tests for buildRegistrationCardHtml.
 *
 * The function builds an HTML string from structured data.  These tests verify
 * that the correct guest name, confirmation number, room number, and signature
 * data URL all appear in the generated output.  No browser is required because
 * buildRegistrationCardHtml is a pure string-building function.
 */
import { describe, it, expect } from "vitest";
import { buildRegistrationCardHtml } from "../client/src/components/RegistrationCardPrint.js";

const BASE_DATA = {
  guestName: "Jane Doe",
  guestEmail: "jane.doe@example.com",
  guestPhone: "+1-555-9876",
  idType: "passport",
  idNumber: "XY987654",
  nationality: "Canadian",
  roomNumber: "302",
  confirmationNumber: "CONF-2024-001",
  checkInDate: "2024-08-10",
  checkOutDate: "2024-08-13",
  nights: 3,
  rateAmount: "200.00",
  depositAmount: "100.00",
  depositPaid: true,
  signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
  propertyName: "Grand Test Hotel",
  propertyAddress: "123 Main Street, Testville",
  propertyPhone: "+1-800-TEST",
  printedBy: "receptionist",
  printedAt: "2024-08-10 08:30",
};

describe("buildRegistrationCardHtml", () => {
  it("contains the guest name", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain("Jane Doe");
  });

  it("contains the confirmation number", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain("CONF-2024-001");
  });

  it("contains the room number", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain("302");
  });

  it("embeds the signature data URL in an img src", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain(
      'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"'
    );
  });

  it("contains the check-in and check-out dates", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain("2024-08-10");
    expect(html).toContain("2024-08-13");
  });

  it("contains the property name", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(html).toContain("Grand Test Hotel");
  });

  it("renders a signature-line placeholder when no signature is provided", () => {
    const html = buildRegistrationCardHtml({ ...BASE_DATA, signature: null });
    expect(html).toContain('class="signature-line"');
    expect(html).not.toContain("<img");
  });

  it("HTML-escapes special characters in guest name", () => {
    const html = buildRegistrationCardHtml({
      ...BASE_DATA,
      guestName: 'O\'Brien <Test> & "Co"',
    });
    expect(html).toContain("O&#x27;Brien &lt;Test&gt; &amp; &quot;Co&quot;");
    // Raw characters must not appear unescaped inside field values
    expect(html).not.toContain('<script');
  });

  it("returns a non-empty string that is valid HTML", () => {
    const html = buildRegistrationCardHtml(BASE_DATA);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});
