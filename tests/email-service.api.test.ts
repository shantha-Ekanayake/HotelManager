/**
 * Unit tests for email-service delivery outcomes and SMTP configuration.
 *
 * Stub nodemailer.createTransport to exercise the real check-in and check-out
 * implementations without touching a mail server. Cover missing addresses,
 * partial SMTP configuration, and successful or failed delivery attempts.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── stub nodemailer BEFORE the module under test is imported ─────────────────
const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-msg-id" });
const createTransportMock = vi.fn().mockReturnValue({ sendMail: sendMailMock });

vi.mock("nodemailer", () => ({
  default: { createTransport: (...args: unknown[]) => createTransportMock(...args) },
}));

// ── import real implementation (receives stubbed nodemailer) ─────────────────
import { sendCheckInEmail, sendCheckOutEmail } from "../server/email-service.js";

// ── shared fixtures ──────────────────────────────────────────────────────────
const BASE_RESERVATION = {
  confirmationNumber: "CONF-001",
  arrivalDate: new Date("2026-08-16"),
  departureDate: new Date("2026-08-17"),
  nights: 1,
  totalAmount: "150.00",
  depositAmount: null,
  depositPaid: false,
};

const BASE_FOLIO = {
  charges: [{ description: "Room charge", amount: "150.00" }],
  payments: [{ paymentMethod: "cash", amount: "150.00", paymentDate: new Date("2026-08-17") }],
};

// ── setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  // Simulate SMTP configured so we reach the no-email guard instead of the
  // no-SMTP guard.
  process.env.SMTP_HOST = "smtp.example.com";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "user@example.com";
  process.env.SMTP_PASS = "secret";
  process.env.SMTP_FROM = "noreply@example.com";
  sendMailMock.mockReset().mockResolvedValue({ messageId: "test-msg-id" });
  createTransportMock.mockClear();
});

afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
});

// ── sendCheckInEmail ─────────────────────────────────────────────────────────
describe("sendCheckInEmail – no-email guard (SMTP configured)", () => {
  it("returns 'skipped' and never calls sendMail when guest.email is null", async () => {
    const guest = { firstName: "Jane", lastName: "Doe", email: null };

    const result = await sendCheckInEmail(
      guest,
      BASE_RESERVATION,
      "101",
      "Grand Hotel",
      "+1-555-0000"
    );

    expect(result).toBe("skipped");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("returns 'skipped' and never calls sendMail when guest.email is undefined", async () => {
    const guest = { firstName: "Jane", lastName: "Doe", email: undefined };

    const result = await sendCheckInEmail(
      guest,
      BASE_RESERVATION,
      "101",
      "Grand Hotel"
    );

    expect(result).toBe("skipped");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("returns 'sent' and calls sendMail exactly once when guest has a real email", async () => {
    const guest = { firstName: "Jane", lastName: "Doe", email: "jane@example.com" };

    const result = await sendCheckInEmail(
      guest,
      BASE_RESERVATION,
      "101",
      "Grand Hotel",
      "+1-555-0000"
    );

    expect(result).toBe("sent");
    expect(sendMailMock).toHaveBeenCalledOnce();

    // Confirm the mail was addressed to the guest
    const mailArgs = sendMailMock.mock.calls[0][0] as { to: string; subject: string };
    expect(mailArgs.to).toContain("jane@example.com");
    expect(mailArgs.subject).toContain("CONF-001");
  });
});

// ── sendCheckOutEmail ────────────────────────────────────────────────────────
describe("sendCheckOutEmail – no-email guard (SMTP configured)", () => {
  it("returns 'skipped' and never calls sendMail when guest.email is null", async () => {
    const guest = { firstName: "John", lastName: "Smith", email: null };

    const result = await sendCheckOutEmail(
      guest,
      BASE_RESERVATION,
      BASE_FOLIO,
      "Grand Hotel"
    );

    expect(result).toBe("skipped");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("returns 'skipped' and never calls sendMail when guest.email is undefined", async () => {
    const guest = { firstName: "John", lastName: "Smith", email: undefined };

    const result = await sendCheckOutEmail(
      guest,
      BASE_RESERVATION,
      BASE_FOLIO,
      "Grand Hotel"
    );

    expect(result).toBe("skipped");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("returns 'sent' and calls sendMail exactly once when guest has a real email", async () => {
    const guest = { firstName: "John", lastName: "Smith", email: "john@example.com" };

    const result = await sendCheckOutEmail(
      guest,
      BASE_RESERVATION,
      BASE_FOLIO,
      "Grand Hotel"
    );

    expect(result).toBe("sent");
    expect(sendMailMock).toHaveBeenCalledOnce();

    // Confirm the mail was addressed to the guest
    const mailArgs = sendMailMock.mock.calls[0][0] as { to: string; subject: string };
    expect(mailArgs.to).toContain("john@example.com");
    expect(mailArgs.subject).toContain("CONF-001");
  });
});

describe("email service – partially configured SMTP", () => {
  beforeEach(() => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it.each([
    {
      name: "check-in",
      send: () =>
        sendCheckInEmail(
          { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
          BASE_RESERVATION,
          "101",
          "Grand Hotel"
        ),
    },
    {
      name: "check-out",
      send: () =>
        sendCheckOutEmail(
          { firstName: "John", lastName: "Smith", email: "john@example.com" },
          BASE_RESERVATION,
          BASE_FOLIO,
          "Grand Hotel"
        ),
    },
  ])("attempts $name delivery when SMTP_HOST is set without credentials", async ({ send }) => {
    const result = await send();

    expect(result).toBe("sent");
    expect(result).not.toBe("skipped");
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        auth: undefined,
      })
    );
    expect(sendMailMock).toHaveBeenCalledOnce();
  });
});

describe("email service – SMTP user without a password", () => {
  beforeEach(() => {
    delete process.env.SMTP_PASS;
  });

  it.each([
    {
      name: "check-in",
      send: () =>
        sendCheckInEmail(
          { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
          BASE_RESERVATION,
          "101",
          "Grand Hotel"
        ),
    },
    {
      name: "check-out",
      send: () =>
        sendCheckOutEmail(
          { firstName: "John", lastName: "Smith", email: "john@example.com" },
          BASE_RESERVATION,
          BASE_FOLIO,
          "Grand Hotel"
        ),
    },
  ])("reports $name delivery as sent when the transport accepts it", async ({ send }) => {
    const result = await send();

    expect(result).toBe("sent");
    expect(result).not.toBe("skipped");
    expect(createTransportMock).toHaveBeenCalledOnce();
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        auth: { user: "user@example.com", pass: "" },
      })
    );
    expect(sendMailMock).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "check-in",
      send: () =>
        sendCheckInEmail(
          { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
          BASE_RESERVATION,
          "101",
          "Grand Hotel"
        ),
    },
    {
      name: "check-out",
      send: () =>
        sendCheckOutEmail(
          { firstName: "John", lastName: "Smith", email: "john@example.com" },
          BASE_RESERVATION,
          BASE_FOLIO,
          "Grand Hotel"
        ),
    },
  ])("reports $name delivery as failed when the transport rejects it", async ({ send }) => {
    sendMailMock.mockRejectedValueOnce(new Error("SMTP authentication rejected"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await send();

      expect(result).toBe("failed");
      expect(result).not.toBe("skipped");
      expect(createTransportMock).toHaveBeenCalledOnce();
      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.example.com",
          auth: { user: "user@example.com", pass: "" },
        })
      );
      expect(sendMailMock).toHaveBeenCalledOnce();
      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send"),
        expect.any(String),
        "| Confirmation:",
        "CONF-001",
        expect.any(Error)
      );
    } finally {
      logError.mockRestore();
    }
  });
});

describe("email service – partial SMTP variables without a host", () => {
  beforeEach(() => {
    delete process.env.SMTP_HOST;
  });

  it.each([
    {
      name: "check-in",
      send: () =>
        sendCheckInEmail(
          { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
          BASE_RESERVATION,
          "101",
          "Grand Hotel"
        ),
    },
    {
      name: "check-out",
      send: () =>
        sendCheckOutEmail(
          { firstName: "John", lastName: "Smith", email: "john@example.com" },
          BASE_RESERVATION,
          BASE_FOLIO,
          "Grand Hotel"
        ),
    },
  ])("skips $name delivery when credentials exist but SMTP_HOST is absent", async ({ send }) => {
    const result = await send();

    expect(result).toBe("skipped");
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
