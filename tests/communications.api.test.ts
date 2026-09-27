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
import {
  generateCommunicationServiceToken,
  generateToken,
} from "../server/auth.js";
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

describe("GET /api/guests/:id/communications — high-volume history", () => {
  it("returns every entry newest-first when a guest has dozens of communications", async () => {
    const guest = await memStorage.createGuest({
      firstName: "Volume",
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

    const seeded = [];
    for (let index = 0; index < 25; index += 1) {
      const communication = await memStorage.createGuestCommunication({
        guestId: guest.id,
        type: "note",
        direction: "internal",
        subject: `History entry ${index}`,
        content: `Volume test entry ${index}`,
        status: "sent",
        staffId: FRONTDESK_USER.id,
      });
      communication.createdAt = new Date(
        Date.UTC(2026, 0, 1, 0, index)
      );
      seeded.push(communication);
    }

    const res = await request(app)
      .get(`/api/guests/${guest.id}/communications`)
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body.communications).toHaveLength(seeded.length);
    expect(res.body.communications.map((comm: any) => comm.id)).toEqual(
      seeded.map((comm) => comm.id).reverse()
    );
  });
});

describe("GET /api/guests/:id/communications — tied timestamps", () => {
  it("orders entries with the same timestamp by ID descending on repeated requests", async () => {
    const guest = await memStorage.createGuest({
      firstName: "Tied",
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
    const tiedAt = new Date("2026-01-01T00:00:00.000Z");
    // Seed in a different order from the expected ID order to catch insertion-order sorting.
    for (const id of ["tie-b", "tie-a", "tie-c"]) {
      const communication = await memStorage.createGuestCommunication({
        guestId: guest.id,
        type: "note",
        direction: "internal",
        subject: id,
        content: id,
        status: "sent",
        staffId: FRONTDESK_USER.id,
      });
      communication.id = id;
      communication.createdAt = tiedAt;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await request(app)
        .get(`/api/guests/${guest.id}/communications`)
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.communications.map((comm: { id: string }) => comm.id)).toEqual([
        "tie-c", "tie-b", "tie-a",
      ]);
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
    expect(res.body.communication.staffId).toBe(FRONTDESK_USER.id);
  });

  it("saves with a null staffId when the service token user is absent from storage", async () => {
    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set(
        "Authorization",
        `Bearer ${generateCommunicationServiceToken("system-communications")}`
      )
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.communication).toHaveProperty("staffId", null);
  });

  it("rejects a normal staff token when its user is absent from storage", async () => {
    const deletedUserToken = generateToken({
      ...FRONTDESK_USER,
      id: "deleted-user",
    });

    const res = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", `Bearer ${deletedUserToken}`)
      .send(validBody);

    expect(res.status).toBe(401);
  });

  it("uses the stored role when a staff user's permissions have changed", async () => {
    const getUserSpy = vi.spyOn(memStorage, "getUser").mockResolvedValueOnce({
      ...FRONTDESK_USER,
      role: "auditor",
    });

    try {
      const res = await request(app)
        .post(`/api/guests/${guestId}/communications`)
        .set("Authorization", authHeader)
        .send(validBody);

      expect(res.status).toBe(403);
    } finally {
      getUserSpy.mockRestore();
    }
  });

  it("rejects an inactive stored user", async () => {
    const getUserSpy = vi.spyOn(memStorage, "getUser").mockResolvedValueOnce({
      ...FRONTDESK_USER,
      isActive: false,
    });

    try {
      const res = await request(app)
        .post(`/api/guests/${guestId}/communications`)
        .set("Authorization", authHeader)
        .send(validBody);

      expect(res.status).toBe(401);
    } finally {
      getUserSpy.mockRestore();
    }
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

  it("counts a newly logged outbound email failure immediately, without a backfill", async () => {
    const created = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send({
        type: "email",
        direction: "outbound",
        subject: "Departure receipt [FAILED]",
        content: "Email delivery failed: address rejected.",
      });

    expect(created.status).toBe(201);
    expect(created.body.communication.status).toBe("failed");

    const list = await request(app)
      .get(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader);
    expect(list.body.communications.find((c: any) => c.id === created.body.communication.id)?.status).toBe("failed");
  });

  it("preserves an explicitly supplied delivery status", async () => {
    const created = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send({
        type: "email",
        direction: "outbound",
        subject: "Retry [FAILED]",
        content: "Previously failed, now delivered.",
        status: "sent",
      });
    expect(created.status).toBe(201);
    expect(created.body.communication.status).toBe("sent");
  });

  it.each([
    ["email", "outbound", "Follow-up about failed delivery", "The previous email failed."],
    ["email", "inbound", "Receipt [FAILED]", "Email delivery failed: please help."],
    ["phone", "outbound", "Receipt [FAILED]", "Email delivery failed: please help."],
  ])("does not classify ordinary or non-outbound-email records as failures", async (type, direction, subject, content) => {
    const created = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send({ type, direction, subject, content });
    expect(created.status).toBe(201);
    expect(created.body.communication.status).toBeNull();
  });

  it("rejects unknown delivery statuses", async () => {
    const created = await request(app)
      .post(`/api/guests/${guestId}/communications`)
      .set("Authorization", authHeader)
      .send({ ...validBody, status: "unknown" });
    expect(created.status).toBe(400);
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
