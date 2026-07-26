/**
 * Backend integration tests for the check-in flow.
 *
 * Strategy: swap the real database storage for the in-memory MemStorage so
 * the tests run without any Postgres connection.  The vi.mock() call is hoisted
 * by Vitest before any module is evaluated, so every downstream import of
 * "server/storage" receives the in-memory instance instead.
 */
import { vi, describe, it, expect, beforeAll } from "vitest";
import { memStorage } from "../server/mem-storage.js";

// ── hoisted mock ────────────────────────────────────────────────────────────
vi.mock("../server/storage.js", () => ({ storage: memStorage }));

// ── imports that depend on the mocked storage ───────────────────────────────
import express from "express";
import request from "supertest";
import { registerHMSRoutes } from "../server/hms-routes.js";
import { generateToken } from "../server/auth.js";
import type { User } from "../shared/schema.js";

// ── one shared Express app for the whole suite ───────────────────────────────
const app = express();
app.use(express.json());
registerHMSRoutes(app);

// ── helpers ──────────────────────────────────────────────────────────────────
/** A front-desk user that already lives in the memStorage seed data. */
const FRONTDESK_USER: User = {
  id: "user-frontdesk",
  username: "frontdesk",
  email: "frontdesk@grandhotel.com",
  firstName: "Front",
  lastName: "Desk",
  role: "front_desk_staff" as const,
  propertyId: "prop-demo",
  isActive: true,
  password: "hashed",
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let authHeader: string;
let testReservationId: string;
let testGuestId: string;

// ── test data setup ──────────────────────────────────────────────────────────
beforeAll(async () => {
  // Generate a real JWT for the front-desk user
  authHeader = `Bearer ${generateToken(FRONTDESK_USER)}`;

  // Create a fresh guest so tests are isolated from seed data
  const guest = await memStorage.createGuest({
    firstName: "Test",
    lastName: "Guest",
    email: "test.guest@example.com",
    phone: "+1-555-0123",
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
  testGuestId = guest.id;

  // Create a reservation against the demo property
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reservation = await memStorage.createReservation({
    propertyId: "prop-demo",
    guestId: testGuestId,
    roomTypeId: "rt-standard",
    ratePlanId: "rp-standard",
    status: "confirmed",
    arrivalDate: today,
    departureDate: tomorrow,
    nights: 1,
    adults: 1,
    children: 0,
    totalAmount: "150.00",
    depositAmount: null,
    depositPaid: false,
    specialRequests: null,
    roomId: null,
    checkInTime: null,
    checkOutTime: null,
    guestSignature: null,
    notes: null,
  });
  testReservationId = reservation.id;
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("POST /api/reservations/:id/check-in", () => {
  it("saves idType, idNumber and nationality to the guest record", async () => {
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/check-in`)
      .set("Authorization", authHeader)
      .send({
        roomId: "room-101",
        depositAmount: "100",
        paymentMethod: "credit_card",
        idType: "passport",
        idNumber: "AB123456",
        nationality: "Pakistani",
        signature: null,
      });

    expect(res.status).toBe(200);

    // Verify the guest record was updated
    const updatedGuest = await memStorage.getGuest(testGuestId);
    expect(updatedGuest?.idType).toBe("passport");
    expect(updatedGuest?.idNumber).toBe("AB123456");
    expect(updatedGuest?.nationality).toBe("Pakistani");
  });

  it("saves guestSignature on the reservation when a data-URL is supplied", async () => {
    // Create a second reservation for this assertion so state is fresh
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const guest2 = await memStorage.createGuest({
      firstName: "Sig",
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
      vipStatus: false,
      notes: null,
      dateOfBirth: null,
      preferences: {},
    });

    const res2 = await memStorage.createReservation({
      propertyId: "prop-demo",
      guestId: guest2.id,
      roomTypeId: "rt-standard",
      ratePlanId: "rp-standard",
      status: "confirmed",
      arrivalDate: today,
      departureDate: tomorrow,
      nights: 1,
      adults: 1,
      children: 0,
      totalAmount: "150.00",
      depositAmount: null,
      depositPaid: false,
      specialRequests: null,
      roomId: null,
      checkInTime: null,
      checkOutTime: null,
      guestSignature: null,
      notes: null,
    });

    const fakeDataUrl = "data:image/png;base64,iVBORw0KGgo=";

    const response = await request(app)
      .post(`/api/reservations/${res2.id}/check-in`)
      .set("Authorization", authHeader)
      .send({
        roomId: "room-201",
        depositAmount: "0",
        paymentMethod: "cash",
        signature: fakeDataUrl,
      });

    expect(response.status).toBe(200);

    // Verify guestSignature is stored on the reservation
    const updatedReservation = await memStorage.getReservation(res2.id);
    expect(updatedReservation?.guestSignature).toBe(fakeDataUrl);
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .post("/api/reservations/non-existent-id/check-in")
      .set("Authorization", authHeader)
      .send({ roomId: "room-101", depositAmount: "0", paymentMethod: "cash" });

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/check-in`)
      .send({ roomId: "room-101", depositAmount: "0", paymentMethod: "cash" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/reservations/:id/send-checkin-email", () => {
  it("returns 200 when SMTP is not configured (no-op path)", async () => {
    // SMTP_HOST is intentionally blank in vitest.config.ts so sendCheckInEmail
    // takes the no-op branch and the request still completes successfully.
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/send-checkin-email`)
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .post("/api/reservations/does-not-exist/send-checkin-email")
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(404);
  });
});
