import { afterEach, describe, expect, it, vi } from "vitest";
import { memStorage } from "../server/mem-storage.js";

vi.mock("../server/storage.js", () => ({ storage: memStorage }));

const { sendMailMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}));

import express from "express";
import request from "supertest";
import { registerHMSRoutes } from "../server/hms-routes.js";
import { generateToken } from "../server/auth.js";
import type { User } from "../shared/schema.js";

const app = express();
app.use(express.json());
registerHMSRoutes(app);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  sendMailMock.mockReset();
});

describe("check-out email delivery failure", () => {
  it("checks out the reservation and records exactly one failed communication when SMTP rejects", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    sendMailMock.mockRejectedValueOnce(new Error("SMTP delivery rejected"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const guest = await memStorage.createGuest({
      firstName: "Departure",
      lastName: "Failure",
      email: "departure.failure@example.test",
      phone: null,
      address: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      idType: null,
      idNumber: null,
      nationality: null,
      vipStatus: false,
      notes: null,
      dateOfBirth: null,
      preferences: {},
    });
    const arrivalDate = new Date();
    const departureDate = new Date(arrivalDate.getTime() + 24 * 60 * 60 * 1000);
    const reservation = await memStorage.createReservation({
      propertyId: "prop-demo",
      guestId: guest.id,
      roomTypeId: "rt-standard",
      ratePlanId: "rp-standard",
      status: "checked_in",
      arrivalDate,
      departureDate,
      nights: 1,
      adults: 1,
      children: 0,
      totalAmount: "150.00",
      depositAmount: null,
      depositPaid: false,
      specialRequests: null,
      roomId: null,
      checkInTime: new Date(),
      checkOutTime: null,
      guestSignature: null,
      notes: null,
    });
    await memStorage.createFolio({
      reservationId: reservation.id,
      propertyId: "prop-demo",
      guestId: guest.id,
      status: "open",
      totalCharges: "0.00",
      totalPayments: "0.00",
      balance: "0.00",
      notes: null,
    });
    const frontDeskUser: User = {
      id: "user-frontdesk",
      username: "frontdesk",
      email: "frontdesk@grandhotel.com",
      firstName: "Front",
      lastName: "Desk",
      role: "front_desk_staff",
      propertyId: "prop-demo",
      isActive: true,
      password: "hashed",
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await request(app)
      .post(`/api/reservations/${reservation.id}/check-out`)
      .set("Authorization", `Bearer ${generateToken(frontDeskUser)}`)
      .send({});

    expect(sendMailMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.body.emailStatus).toBe("failed");
    expect(response.body.reservation.status).toBe("checked_out");
    expect(response.body.reservation.checkOutTime).toBeTruthy();
    expect((await memStorage.getReservation(reservation.id))?.status).toBe("checked_out");
    expect(await memStorage.getGuestCommunications(guest.id)).toEqual([
      expect.objectContaining({
        guestId: guest.id,
        type: "email",
        direction: "outbound",
        subject: `Departure receipt – #${reservation.confirmationNumber} [FAILED]`,
        content: "Email delivery failed during check-out (email service returned failure).",
        status: "failed",
        staffId: frontDeskUser.id,
      }),
    ]);
  });
});