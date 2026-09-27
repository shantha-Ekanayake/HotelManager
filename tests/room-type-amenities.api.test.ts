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
let otherPropertyId: string;
let userId: string;
let token: string;
let roomTypeId: string;
let otherRoomTypeId: string;

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

    const [otherProperty] = await db.insert(properties).values({
      name: `Other amenities test ${suffix}`,
      address: "Test address",
      city: "Test city",
      country: "Test country",
    }).returning();
    otherPropertyId = otherProperty.id;

    const [otherRoomType] = await db.insert(roomTypes).values({
      propertyId: otherPropertyId,
      name: "Other hotel's room type",
      baseRate: "100.00",
      amenities: ["Pool"],
    }).returning();
    otherRoomTypeId = otherRoomType.id;

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
    if (otherRoomTypeId) await db.delete(roomTypes).where(eq(roomTypes.id, otherRoomTypeId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (propertyId) await db.delete(properties).where(eq(properties.id, propertyId));
    if (otherPropertyId) await db.delete(properties).where(eq(properties.id, otherPropertyId));
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

    for (const amenities of ["WiFi", [7], { WiFi: true }, null]) {
      const invalid = await request(app)
        .put(`/api/room-types/${roomTypeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Should not be saved", amenities });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toBe("Validation error");
      expect(await readAmenities()).toEqual(["WiFi", "Pool", "Gym"]);
    }

    const unrelated = await request(app)
      .put(`/api/room-types/${roomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ propertyId: randomUUID(), name: "Should not be saved" });
    expect(unrelated.status).toBe(400);

    const edited = await request(app)
      .put(`/api/room-types/${roomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated amenities test room", baseRate: 125, amenities: ["Desk"] });
    expect(edited.status).toBe(200);
    expect(edited.body.roomType).toMatchObject({
      name: "Updated amenities test room",
      baseRate: "125.00",
      amenities: ["Desk"],
    });
    expect(await readAmenities()).toEqual(["Desk"]);

    const cleared = await request(app)
      .put(`/api/room-types/${roomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amenities: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.roomType.amenities).toEqual([]);
    expect(await readAmenities()).toEqual([]);
  });

  it("rejects a manager's update to another hotel's room type without changing it", async () => {
    const response = await request(app)
      .put(`/api/room-types/${otherRoomTypeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unauthorized change", amenities: ["Gym"] });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Access denied");
    const [stored] = await db.select().from(roomTypes).where(eq(roomTypes.id, otherRoomTypeId));
    expect(stored).toMatchObject({
      propertyId: otherPropertyId,
      name: "Other hotel's room type",
      amenities: ["Pool"],
    });
  });
});