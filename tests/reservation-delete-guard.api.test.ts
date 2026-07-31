/**
 * Integration tests for the DELETE /api/reservations/:id and DELETE /api/rooms/:id
 * guard logic.
 *
 * The tests verify that:
 *  - Reservations with status checked_in, checked_out, or no_show are rejected
 *    with 409 Conflict and cannot be deleted.
 *  - Reservations with status confirmed, pending, or cancelled are accepted and
 *    deleted successfully.
 *  - A room that has a non-cancelled reservation referencing it is rejected with
 *    409 Conflict.
 *  - A room whose only reservations are cancelled can be deleted successfully.
 *
 * Strategy: swap the real database storage for the in-memory MemStorage so
 * the tests run without any Postgres connection.
 */
import { vi, describe, it, expect, beforeAll } from "vitest";
import { memStorage } from "../server/mem-storage.js";

vi.mock("../server/storage.js", () => ({ storage: memStorage }));
vi.mock("../server/email-service.js", () => ({
  sendCheckOutEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckInEmail: vi.fn().mockResolvedValue(undefined),
}));

import express from "express";
import request from "supertest";
import { registerHMSRoutes } from "../server/hms-routes.js";
import { generateToken } from "../server/auth.js";
import type { User } from "../shared/schema.js";

const app = express();
app.use(express.json());
registerHMSRoutes(app);

// A manager-level user that matches the memStorage seed data (user-manager / hotel_manager).
// hotel_manager has both reservations.manage and rooms.manage.
const MANAGER_USER: User = {
  id: "user-manager",
  username: "manager",
  email: "manager@grandhotel.com",
  firstName: "John",
  lastName: "Manager",
  role: "hotel_manager" as const,
  propertyId: "prop-demo",
  isActive: true,
  password: "hashed",
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let authHeader: string;

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

/** Helper: create a minimal guest in mem-storage */
async function makeGuest(firstName: string) {
  return memStorage.createGuest({
    firstName,
    lastName: "GuardTest",
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
}

/** Helper: create a reservation with a given status, optionally tagged as a test fixture */
async function makeReservation(
  guestId: string,
  status: "confirmed" | "pending" | "cancelled" | "checked_in" | "checked_out" | "no_show",
  roomId: string | null = null,
  isTestFixture = false
) {
  return memStorage.createReservation({
    propertyId: "prop-demo",
    guestId,
    roomTypeId: "rt-standard",
    ratePlanId: "rp-standard",
    status,
    arrivalDate: today,
    departureDate: tomorrow,
    nights: 1,
    adults: 1,
    children: 0,
    totalAmount: "100.00",
    depositAmount: null,
    depositPaid: false,
    specialRequests: null,
    roomId,
    checkInTime: status === "checked_in" ? new Date() : null,
    checkOutTime: status === "checked_out" ? new Date() : null,
    guestSignature: null,
    notes: isTestFixture ? "E2E_TEST_FIXTURE" : null,
  });
}

beforeAll(() => {
  authHeader = `Bearer ${generateToken(MANAGER_USER)}`;
});

// ── Reservation DELETE guards ──────────────────────────────────────────────────

describe("DELETE /api/reservations/:id — status guard", () => {
  it("rejects a checked_in reservation with 409", async () => {
    const guest = await makeGuest("CheckedIn");
    const res_obj = await makeReservation(guest.id, "checked_in");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/operational status/i);
  });

  it("rejects a checked_out reservation with 409", async () => {
    const guest = await makeGuest("CheckedOut");
    const res_obj = await makeReservation(guest.id, "checked_out");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/operational status/i);
  });

  it("rejects a no_show reservation with 409", async () => {
    const guest = await makeGuest("NoShow");
    const res_obj = await makeReservation(guest.id, "no_show");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/operational status/i);
  });

  it("allows deleting a confirmed reservation", async () => {
    const guest = await makeGuest("Confirmed");
    const res_obj = await makeReservation(guest.id, "confirmed");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows deleting a cancelled reservation", async () => {
    const guest = await makeGuest("Cancelled");
    const res_obj = await makeReservation(guest.id, "cancelled");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows deleting a checked_in reservation tagged as E2E_TEST_FIXTURE", async () => {
    const guest = await makeGuest("FixtureCheckedIn");
    const res_obj = await makeReservation(guest.id, "checked_in", null, true);

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows deleting a checked_out reservation tagged as E2E_TEST_FIXTURE", async () => {
    const guest = await makeGuest("FixtureCheckedOut");
    const res_obj = await makeReservation(guest.id, "checked_out", null, true);

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .delete("/api/reservations/does-not-exist")
      .set("Authorization", authHeader);

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const guest = await makeGuest("Unauth");
    const res_obj = await makeReservation(guest.id, "confirmed");

    const res = await request(app)
      .delete(`/api/reservations/${res_obj.id}`);

    expect(res.status).toBe(401);
  });
});

// ── Room DELETE guards ─────────────────────────────────────────────────────────

describe("DELETE /api/rooms/:id — active-reservation guard", () => {
  it("rejects deleting a room that has a confirmed reservation with 409", async () => {
    const guest = await makeGuest("RoomConfirmed");
    // Create the room first so we have its real auto-generated ID
    const room = await memStorage.createRoom({
      propertyId: "prop-demo",
      roomTypeId: "rt-standard",
      roomNumber: `guard-room-${Date.now()}-confirmed`,
      floor: "1",
      status: "available",
      isActive: true,
      notes: null,
    });
    // Reference the room's real ID in the reservation
    await makeReservation(guest.id, "confirmed", room.id);

    const res = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active reservations/i);
  });

  it("rejects deleting a room that has a checked_in reservation with 409", async () => {
    const guest = await makeGuest("RoomCheckedIn");
    const room = await memStorage.createRoom({
      propertyId: "prop-demo",
      roomTypeId: "rt-standard",
      roomNumber: `guard-room-${Date.now()}-checked-in`,
      floor: "1",
      status: "occupied",
      isActive: true,
      notes: null,
    });
    await makeReservation(guest.id, "checked_in", room.id);

    const res = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active reservations/i);
  });

  it("allows deleting a room whose only reservations are cancelled", async () => {
    const guest = await makeGuest("RoomCancelled");
    const room = await memStorage.createRoom({
      propertyId: "prop-demo",
      roomTypeId: "rt-standard",
      roomNumber: `guard-room-${Date.now()}-cancelled`,
      floor: "1",
      status: "available",
      isActive: true,
      notes: null,
    });
    await makeReservation(guest.id, "cancelled", room.id);

    const res = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows deleting a room with no reservations at all", async () => {
    const room = await memStorage.createRoom({
      propertyId: "prop-demo",
      roomTypeId: "rt-standard",
      roomNumber: `guard-room-${Date.now()}-empty`,
      floor: "1",
      status: "available",
      isActive: true,
      notes: null,
    });

    const res = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
