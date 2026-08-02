/**
 * Integration tests for the DELETE /api/room-types/:id guard.
 *
 * Verifies that:
 *  - A room-type that has any room referencing it (active or inactive) is
 *    rejected with 409 Conflict. Inactive rooms still hold the foreign-key
 *    reference and would cause a DB-level error if the type were deleted.
 *  - A room-type with no rooms at all can be deleted successfully.
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

/** Helper: create a fresh room type in memStorage for prop-demo */
async function makeRoomType(suffix: string) {
  return memStorage.createRoomType({
    propertyId: "prop-demo",
    name: `Test Type ${suffix}`,
    description: "Guard test room type",
    maxOccupancy: 2,
    baseRate: "99.00",
    amenities: [],
  });
}

/** Helper: create a room referencing a given room type */
async function makeRoom(roomTypeId: string, isActive: boolean = true) {
  return memStorage.createRoom({
    propertyId: "prop-demo",
    roomTypeId,
    roomNumber: `guard-rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    floor: "1",
    status: "available",
    isActive,
    notes: null,
  });
}

describe("DELETE /api/room-types/:id — referencing-room guard", () => {
  it("returns 409 when the room type has an active room referencing it", async () => {
    const roomType = await makeRoomType("with-active-room");
    await makeRoom(roomType.id, true);

    const res = await request(app)
      .delete(`/api/room-types/${roomType.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existing room/i);
    expect(res.body.details).toMatch(/1 room/i);
  });

  it("returns 409 with the correct count when multiple rooms reference the type", async () => {
    const roomType = await makeRoomType("with-two-rooms");
    await makeRoom(roomType.id, true);
    await makeRoom(roomType.id, true);

    const res = await request(app)
      .delete(`/api/room-types/${roomType.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.details).toMatch(/2 room/i);
  });

  it("returns 409 even when the only referencing room is inactive (isActive = false)", async () => {
    // Inactive rooms still hold the FK — deleting the type would violate the constraint
    const roomType = await makeRoomType("with-inactive-room");
    await makeRoom(roomType.id, false);

    const res = await request(app)
      .delete(`/api/room-types/${roomType.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existing room/i);
  });

  it("allows deleting a room type that has no rooms at all", async () => {
    const roomType = await makeRoomType("no-rooms");

    const res = await request(app)
      .delete(`/api/room-types/${roomType.id}`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent room type", async () => {
    const res = await request(app)
      .delete("/api/room-types/does-not-exist")
      .set("Authorization", authHeader);

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const roomType = await makeRoomType("unauth");

    const res = await request(app)
      .delete(`/api/room-types/${roomType.id}`);

    expect(res.status).toBe(401);
  });
});
