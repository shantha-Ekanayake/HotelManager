/**
 * Backend integration tests for the check-out flow.
 *
 * Strategy: swap the real database storage for the in-memory MemStorage so
 * the tests run without any Postgres connection.  The vi.mock() call is hoisted
 * by Vitest before any module is evaluated, so every downstream import of
 * "server/storage" receives the in-memory instance instead.
 *
 * The email-service is also mocked so we can assert it receives the correct
 * folio data without requiring an SMTP server.
 */
import { vi, describe, it, expect, beforeAll } from "vitest";
import { memStorage } from "../server/mem-storage.js";

// ── hoisted mocks ────────────────────────────────────────────────────────────
vi.mock("../server/storage.js", () => ({ storage: memStorage }));

// vi.hoisted ensures the mock fn exists before the hoisted vi.mock factory runs
const { mockSendCheckOutEmail } = vi.hoisted(() => ({
  mockSendCheckOutEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../server/email-service.js", () => ({
  sendCheckOutEmail: mockSendCheckOutEmail,
  sendCheckInEmail: vi.fn().mockResolvedValue("skipped"),
}));

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
let testFolioId: string;

// ── test data setup ──────────────────────────────────────────────────────────
beforeAll(async () => {
  authHeader = `Bearer ${generateToken(FRONTDESK_USER)}`;

  // Guest with email so the email path is exercised
  const guest = await memStorage.createGuest({
    firstName: "Checkout",
    lastName: "Tester",
    email: "checkout.tester@example.com",
    phone: "+1-555-9999",
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

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reservation = await memStorage.createReservation({
    propertyId: "prop-demo",
    guestId: testGuestId,
    roomTypeId: "rt-standard",
    ratePlanId: "rp-standard",
    status: "checked_in",
    arrivalDate: today,
    departureDate: tomorrow,
    nights: 1,
    adults: 1,
    children: 0,
    totalAmount: "200.00",
    depositAmount: null,
    depositPaid: false,
    specialRequests: null,
    roomId: "room-101",
    checkInTime: new Date(),
    checkOutTime: null,
    guestSignature: null,
    notes: null,
  });
  testReservationId = reservation.id;

  // Create a folio with a charge and a payment
  const folio = await memStorage.createFolio({
    reservationId: testReservationId,
    propertyId: "prop-demo",
    guestId: testGuestId,
    status: "open",
    totalCharges: "200.00",
    totalPayments: "200.00",
    balance: "0.00",
    notes: null,
  });
  testFolioId = folio.id;

  await memStorage.createCharge({
    folioId: testFolioId,
    description: "Room Charge",
    amount: "200.00",
    chargeDate: today,
    chargeType: "room",
    quantity: 1,
    unitPrice: "200.00",
    taxAmount: null,
    notes: null,
  });

  await memStorage.createPayment({
    folioId: testFolioId,
    amount: "200.00",
    paymentMethod: "credit_card",
    paymentDate: today,
    reference: null,
    notes: null,
    processedBy: null,
  });
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("POST /api/reservations/:id/check-out", () => {
  it("returns 200 and updates the reservation to checked_out", async () => {
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/check-out`)
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.reservation.status).toBe("checked_out");
  });

  it("calls sendCheckOutEmail with the correct guest and folio data", async () => {
    // The beforeAll reservation was checked out in the previous test; create a
    // fresh one so we have a clean checked_in reservation to check out here.
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const guest2 = await memStorage.createGuest({
      firstName: "Email",
      lastName: "Assert",
      email: "email.assert@example.com",
      phone: null,
      address: null, city: null, state: null, country: null, postalCode: null,
      idType: null, idNumber: null, nationality: null,
      vipStatus: false, notes: null, dateOfBirth: null, preferences: {},
    });

    const reservation2 = await memStorage.createReservation({
      propertyId: "prop-demo",
      guestId: guest2.id,
      roomTypeId: "rt-standard",
      ratePlanId: "rp-standard",
      status: "checked_in",
      arrivalDate: today,
      departureDate: tomorrow,
      nights: 1,
      adults: 1,
      children: 0,
      totalAmount: "150.00",
      depositAmount: null,
      depositPaid: false,
      specialRequests: null,
      roomId: "room-202",
      checkInTime: new Date(),
      checkOutTime: null,
      guestSignature: null,
      notes: null,
    });

    const folio2 = await memStorage.createFolio({
      reservationId: reservation2.id,
      propertyId: "prop-demo",
      guestId: guest2.id,
      status: "open",
      totalCharges: "150.00",
      totalPayments: "150.00",
      balance: "0.00",
      notes: null,
    });

    await memStorage.createCharge({
      folioId: folio2.id,
      description: "Room Charge",
      amount: "150.00",
      chargeDate: today,
      chargeType: "room",
      quantity: 1,
      unitPrice: "150.00",
      taxAmount: null,
      notes: null,
    });

    mockSendCheckOutEmail.mockClear();

    const res = await request(app)
      .post(`/api/reservations/${reservation2.id}/check-out`)
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(200);

    // Email function must have been called exactly once
    expect(mockSendCheckOutEmail).toHaveBeenCalledTimes(1);

    // Verify the guest arg carries the right email
    const [guestArg, reservationArg, folioArg] = mockSendCheckOutEmail.mock.calls[0];
    expect(guestArg.email).toBe("email.assert@example.com");
    expect(guestArg.firstName).toBe("Email");
    expect(guestArg.lastName).toBe("Assert");

    // Reservation confirmationNumber must be present
    expect(reservationArg.confirmationNumber).toBeTruthy();

    // Folio must carry the charge we created
    expect(folioArg.charges).toHaveLength(1);
    expect(folioArg.charges[0].description).toBe("Room Charge");
    expect(Number(folioArg.charges[0].amount)).toBe(150);
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .post("/api/reservations/non-existent-id/check-out")
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/check-out`)
      .send({});

    expect(res.status).toBe(401);
  });
});

describe("POST /api/reservations/:id/send-checkout-email", () => {
  it("returns 200 and calls sendCheckOutEmail with the correct folio data", async () => {
    mockSendCheckOutEmail.mockClear();

    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/send-checkout-email`)
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });

    // Email function must have been called once
    expect(mockSendCheckOutEmail).toHaveBeenCalledTimes(1);

    // Guest arg carries the correct email
    const [guestArg, , folioArg] = mockSendCheckOutEmail.mock.calls[0];
    expect(guestArg.email).toBe("checkout.tester@example.com");

    // Folio charges should include the room charge created in beforeAll
    expect(Array.isArray(folioArg.charges)).toBe(true);
    expect(folioArg.charges.length).toBeGreaterThanOrEqual(1);
    const roomCharge = folioArg.charges.find(
      (c: { description: string }) => c.description === "Room Charge"
    );
    expect(roomCharge).toBeDefined();
    expect(Number(roomCharge.amount)).toBe(200);
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .post("/api/reservations/does-not-exist/send-checkout-email")
      .set("Authorization", authHeader)
      .send({});

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post(`/api/reservations/${testReservationId}/send-checkout-email`)
      .send({});

    expect(res.status).toBe(401);
  });
});
