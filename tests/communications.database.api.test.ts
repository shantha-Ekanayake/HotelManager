/**
 * PostgreSQL regression check for guest communication history ordering.
 * Run with DATABASE_URL set and the application schema applied.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../server/db.js";
import { DatabaseStorage } from "../server/database-storage.js";
import { guestCommunications, guests } from "../shared/schema.js";

describe("DatabaseStorage.getGuestCommunications", () => {
  it("orders by timestamp descending, then ID descending, on repeated reads", async () => {
    const guestId = randomUUID();
    const prefix = randomUUID();
    const id = (suffix: string) => `${prefix}-${suffix}`;
    const tiedAt = new Date("2026-01-01T12:00:00.000Z");
    let guestCreated = false;

    try {
      await db.insert(guests).values({
        id: guestId,
        firstName: "Ordering",
        lastName: "TestGuest",
      });
      guestCreated = true;

      // Deliberately insert tied IDs out of descending order, and make the
      // older entry's ID sort above the newer entry's ID.
      for (const [entryId, createdAt] of [
        [id("b"), tiedAt],
        [id("a-newer"), new Date("2026-01-02T12:00:00.000Z")],
        [id("a"), tiedAt],
        [id("z-older"), new Date("2025-12-31T12:00:00.000Z")],
        [id("c"), tiedAt],
      ] as const) {
        await db.insert(guestCommunications).values({
          id: entryId,
          guestId,
          type: "note",
          direction: "internal",
          content: entryId,
          createdAt,
        });
      }

      const storage = new DatabaseStorage();
      const expected = [id("a-newer"), id("c"), id("b"), id("a"), id("z-older")];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const history = await storage.getGuestCommunications(guestId);
        expect(history.map((entry) => entry.id)).toEqual(expected);
        expect(history.map((entry) => entry.createdAt)).toEqual([
          new Date("2026-01-02T12:00:00.000Z"),
          tiedAt,
          tiedAt,
          tiedAt,
          new Date("2025-12-31T12:00:00.000Z"),
        ]);
      }
    } finally {
      if (guestCreated) {
        await db.delete(guestCommunications).where(eq(guestCommunications.guestId, guestId));
        await db.delete(guests).where(eq(guests.id, guestId));
      }
    }
  });
});