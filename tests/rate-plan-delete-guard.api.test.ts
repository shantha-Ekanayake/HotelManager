/**
 * Integration tests for the DELETE /api/rate-plans/:id guard.
 *
 * Verifies that:
 *  - A rate plan referenced by any non-cancelled reservation is rejected with 409.
 *  - A rate plan referenced only by cancelled reservations is also rejected with 409
 *    because the FK still exists and a DB delete would fail at the constraint level.
 *  - A rate plan referenced by any daily-rate row is rejected with 409 for the same reason.
 *  - A rate plan with no referencing rows at all can be deleted successfully.
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

beforeAll(() => {
  authHeader = `Bearer ${generateToken(MANAGER_USER)}`;
});

/** Helper: create a fresh rate plan in memStorage for prop-demo */
async function makeRatePlan(suffix: string) {
  return memStorage.createRatePlan({
    propertyId: "prop-demo",
    name: `Test Plan ${suffix}`,
    code: `TP-${suffix}`,
    description: "Guard test rate plan",
    baseRate: "120.00",
    currency: "USD",
    mealPlan: "room_only",
    minLengthOfStay: 1,
    maxLengthOfStay: null,
    isActive: true,
    restrictions: null,
  } as any);
}

/** Helper: create a room type required for reservation FK */
async function makeRoomType() {
  return memStorage.createRoomType({
    propertyId: "prop-demo",
    name: `RT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "Guard test room type",
    maxOccupancy: 2,
    baseRate: "99.00",
    amenities: [],
  });
}

/** Helper: create a guest required for reservation FK */
async function makeGuest() {
  return memStorage.createGuest({
    firstName: "Test",
    lastName: "Guest",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
  } as any);
}

/** Helper: create a reservation referencing the given rate plan */
async function makeReservation(ratePlanId: string, status: string = "confirmed") {
  const roomType = await makeRoomType();
  const guest = await makeGuest();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  return memStorage.createReservation({
    propertyId: "prop-demo",
    guestId: guest.id,
    roomTypeId: roomType.id,
    roomId: null,
    ratePlanId,
    status: status as any,
    arrivalDate: tomorrow,
    departureDate: dayAfter,
    adults: 1,
    children: 0,
    totalAmount: "120.00",
    depositAmount: "0.00",
    specialRequests: null,
    source: "direct",
    notes: null,
  } as any);
}

/** Helper: create a daily rate row referencing the given rate plan */
async function makeDailyRate(ratePlanId: string) {
  const roomType = await makeRoomType();
  return memStorage.createDailyRate({
    propertyId: "prop-demo",
    roomTypeId: roomType.id,
    ratePlanId,
    date: new Date(),
    rate: "120.00",
    minRate: null,
    maxRate: null,
    closeToArrival: false,
    closeToDeparture: false,
    stopSell: false,
  } as any);
}

describe("DELETE /api/rate-plans/:id — FK guard", () => {
  it("returns 409 when the rate plan has a confirmed reservation", async () => {
    const ratePlan = await makeRatePlan("with-confirmed");
    await makeReservation(ratePlan.id, "confirmed");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existing reservations/i);
    expect(res.body.details).toMatch(/non-cancelled reservation/i);
  });

  it("returns 409 when the rate plan has a checked-in reservation", async () => {
    const ratePlan = await makeRatePlan("with-checked-in");
    await makeReservation(ratePlan.id, "checked_in");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existing reservations/i);
  });

  it("returns 409 with the correct count when multiple reservations reference the plan", async () => {
    const ratePlan = await makeRatePlan("with-two-reservations");
    await makeReservation(ratePlan.id, "confirmed");
    await makeReservation(ratePlan.id, "confirmed");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.details).toMatch(/2 non-cancelled reservation/i);
  });

  it("returns 409 even when the only reservation is cancelled (FK still blocks DB delete)", async () => {
    const ratePlan = await makeRatePlan("with-cancelled-only");
    await makeReservation(ratePlan.id, "cancelled");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existing reservations/i);
    expect(res.body.details).toMatch(/cancelled reservation/i);
  });

  it("returns 409 when the rate plan has daily rate records referencing it", async () => {
    const ratePlan = await makeRatePlan("with-daily-rates");
    await makeDailyRate(ratePlan.id);

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/daily rates/i);
    expect(res.body.details).toMatch(/1 daily rate/i);
  });

  it("allows deleting a rate plan with no reservations or daily rates", async () => {
    const ratePlan = await makeRatePlan("no-references");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent rate plan", async () => {
    const res = await request(app)
      .delete("/api/rate-plans/does-not-exist")
      .set("Authorization", authHeader);

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const ratePlan = await makeRatePlan("unauth");

    const res = await request(app)
      .delete(`/api/rate-plans/${ratePlan.id}`);

    expect(res.status).toBe(401);
  });
});
