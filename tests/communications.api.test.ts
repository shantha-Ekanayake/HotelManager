/**
 * Backend integration tests for the guest communications endpoint.
 *
 * Strategy: swap the real database storage for the in-memory MemStorage so
 * tests run without any Postgres connection.  Two scenarios are covered:
 *   1. A guest with zero communications returns an empty array — not a crash.
 *   2. A guest whose only communication has status "failed" returns that
 *      record correctly so the UI can show the failed-email count badge.
 */
import { vi, describe, it, expect, beforeAll } from "vitest";
import { memStorage } from "../server/mem-storage.js";

// ── hoisted mock ─────────────────────────────────────────────────────────────
vi.mock("../server/storage.js", () => ({ storage: memStorage }));

// ── imports that depend on the mocked storage ─────────────────────────────────
import express from "express";
import request from "supertest";
import { registerHMSRoutes } from "../server/hms-routes.js";
import { generateToken } from "../server/auth.js";
import type { User } from "../shared/schema.js";

// ── shared Express app ────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
registerHMSRoutes(app);

// ── helpers ───────────────────────────────────────────────────────────────────
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
/** A guest created once and shared across the suite. */
let guestId: string;

beforeAll(async () => {
  authHeader = `Bearer ${generateToken(FRONTDESK_USER)}`;

  const guest = await memStorage.createGuest({
    firstName: "Comms",
    lastName: "TestGuest",
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
  guestId = guest.id;
});

// ── tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/guests/:id/communications — empty state", () => {
  it("returns HTTP 200 for a guest with no prior contact", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
  });

  it("returns an empty communications array, not null or undefined", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    expect(res.body).toHaveProperty("communications");
    expect(Array.isArray(res.body.communications)).toBe(true);
    expect(res.body.communications).toHaveLength(0);
  });
});

describe("GET /api/guests/:id/communications — failed entry", () => {
  let failedCommId: string;

  beforeAll(async () => {
    const comm = await memStorage.createGuestCommunication({
      guestId,
      type: "email",
      direction: "outbound",
      subject: "Check-in confirmation [FAILED]",
      content: "Email delivery failed: invalid address.",
      status: "failed",
      staffId: null,
    });
    failedCommId = comm.id;
  });

  it("returns HTTP 200 with the FAILED communication included", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.communications)).toBe(true);
    expect(res.body.communications.length).toBeGreaterThan(0);
  });

  it("preserves the failed status so the UI can render the badge", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    const failed = res.body.communications.find(
      (c: any) => c.id === failedCommId
    );
    expect(failed).toBeDefined();
    expect(failed.status).toBe("failed");
  });

  it("each communication record has the fields the UI relies on", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    for (const comm of res.body.communications) {
      expect(comm).toHaveProperty("id");
      expect(comm).toHaveProperty("guestId");
      expect(comm).toHaveProperty("type");
      expect(comm).toHaveProperty("direction");
      expect(comm).toHaveProperty("content");
      expect(comm).toHaveProperty("createdAt");
    }
  });
});

describe("POST /api/guests/:id/communications — save new entry", () => {
  const validBody = {
    type: "note",
    direction: "internal",
    subject: "Room preferences discussed",
    content: "Guest requested extra pillows and quiet room.",
  };

  it("returns HTTP 201 with the saved record", async () => {
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("communication");
  });

  it("returned record contains all expected fields", async () => {
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send(validBody);

    const comm = res.body.communication;
    expect(comm).toHaveProperty("id");
    expect(comm.guestId).toBe(guestId);
    expect(comm.type).toBe(validBody.type);
    expect(comm.direction).toBe(validBody.direction);
    expect(comm.subject).toBe(validBody.subject);
    expect(comm.content).toBe(validBody.content);
    expect(comm).toHaveProperty("createdAt");
  });

  it("new entry immediately appears in the GET list", async () => {
    // Create a uniquely-identifiable entry
    const unique = "unique-marker-" + Date.now();
    await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send({ ...validBody, content: unique });

    const list = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    expect(list.status).toBe(200);
    const found = list.body.communications.find((c: any) => c.content === unique);
    expect(found).toBeDefined();
  });

  it("returns 400 when content is missing", async () => {
    const { content: _omit, ...bodyWithoutContent } = validBody;
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send(bodyWithoutContent);

    expect(res.status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    const { type: _omit, ...bodyWithoutType } = validBody;
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send(bodyWithoutType);

    expect(res.status).toBe(400);
  });

  it("returns 400 when direction is missing", async () => {
    const { direction: _omit, ...bodyWithoutDirection } = validBody;
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send(bodyWithoutDirection);

    expect(res.status).toBe(400);
  });
});
