/**
 * Database-backed API check for room-type amenities. Run with DATABASE_URL set.
 * Uses its own property and user, then removes every fixture after the test.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { generateToken } from "../server/auth.js";
import { registerHMSRoutes } from "../server/hms-routes.js";
import { properties, roomTypes, users } from "../shared/schema.js";

const app = express();
app.use(express.json());
registerHMSRoutes(app);

let propertyId: string;
let userId: string;
let token: string;
let roomTypeId: string;

describe("room-type amenities through the API and database", () => {
  beforeAll(async () => {
    const suffix = randomUUID();
    const [property] = await db.insert(properties).values({
      name: `Amenities test ${suffix}`,
      address: "Test address",
      city: "Test city",
      country: "Test country",
    }).returning();
    propertyId = property.id;

    const [user] = await db.insert(users).values({
      username: `amenities-${suffix}`,
      password: "unused",
      email: `amenities-${suffix}@example.invalid`,
      firstName: "Test",
      lastName: "Manager",
      role: "hotel_manager",
      propertyId,
    }).returning();
    userId = user.id;
    token = generateToken(user);
  });

  afterAll(async () => {
    if (roomTypeId) await db.delete(roomTypes).where(eq(roomTypes.id, roomTypeId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (propertyId) await db.delete(properties).where(eq(properties.id, propertyId));
  });

  async function readAmenities() {
    const response = await request(app)
      .get(`/api/properties/${propertyId}/room-types`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    const roomType = response.body.roomTypes.find((type: { id: string }) => type.id === roomTypeId);
    expect(roomType).toBeDefined();
    return roomType.amenities;
  }

  it("persists non-empty and empty lists on create and update", async () => {
    const created = await request(app)
      .post(`/api/properties/${propertyId}/room-types`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Amenities test room", baseRate: "100.00", amenities: ["WiFi", "Pool"] });
    expect(created.status).toBe(201);
    roomTypeId = created.body.roomType.id;
    expect(created.body.roomType.amenities).toEqual(["WiFi", "Pool"]);
    expect(await readAmenities()).toEqual(["WiFi", "Pool"]);

    const updated = await request(app)
      .put(`/api/room-types/${roomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amenities: ["WiFi", "Pool", "Gym"] });
    expect(updated.status).toBe(200);
    expect(updated.body.roomType.amenities).toEqual(["WiFi", "Pool", "Gym"]);
    expect(await readAmenities()).toEqual(["WiFi", "Pool", "Gym"]);

    const cleared = await request(app)
      .put(`/api/room-types/${roomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amenities: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.roomType.amenities).toEqual([]);
    expect(await readAmenities()).toEqual([]);
  });
});