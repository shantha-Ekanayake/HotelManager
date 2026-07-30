/**
 * Backend integration tests for the guest communications endpoint.
 *
 * Strategy: swap the real database storage for the in-memory MemStorage so
 * tests run without any Postgres connection.  Two scenarios are covered:
 *   1. A guest with zero communications returns an empty array — not a crash.
 *   2. A guest whose only communication has "[FAILED]" in the subject returns
 *      that record correctly so the UI can show the red "Failed" badge.
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

describe("GET /api/guests/:id/communications — FAILED entry", () => {
  let failedCommId: string;

  beforeAll(async () => {
    // Seed a single communication whose subject contains "[FAILED]"
    const comm = await memStorage.createGuestCommunication({
      guestId,
      type: "email",
      direction: "outbound",
      subject: "Check-in confirmation [FAILED]",
      content: "Email delivery failed: invalid address.",
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

  it("preserves the [FAILED] marker in the subject so the UI can render the badge", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);

    const failed = res.body.communications.find(
      (c: any) => c.id === failedCommId
    );
    expect(failed).toBeDefined();
    expect(failed.subject).toContain("[FAILED]");
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
