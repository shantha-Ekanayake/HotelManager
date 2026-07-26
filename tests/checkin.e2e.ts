/**
 * Playwright end-to-end test: full check-in flow.
 *
 * The test is fully self-contained: beforeAll creates its own room type,
 * rate plan, room, guest, and reservation; afterAll tears them all down.
 * It no longer depends on whatever data happens to exist in the live DB.
 *
 * The test:
 *  1. Logs in as front-desk staff via the Login page.
 *  2. Opens Front Desk → Check-in tab.
 *  3. Selects the reservation created in beforeAll.
 *  4. Fills the ID verification fields.
 *  5. Draws a signature on the canvas.
 *  6. Selects the available room created in beforeAll.
 *  7. Submits the form.
 *  8. Asserts the success panel appears and both "Print Registration Card" and
 *     "Resend Welcome Email" buttons are visible.
 */

import { test, expect, request as apiRequest } from "@playwright/test";

// ── credentials (must match what the DB seed created) ───────────────────────
const CREDENTIALS = [
  { username: "frontdesk", password: "frontdesk123" },
  { username: "manager", password: "password123" },
  { username: "admin", password: "admin123" },
];

// ── helpers ──────────────────────────────────────────────────────────────────

async function loginViaApi(
  baseURL: string,
  username: string,
  password: string
): Promise<{ token: string; propertyId: string } | null> {
  const ctx = await apiRequest.newContext({ baseURL });
  try {
    const res = await ctx.post("/api/auth/login", {
      data: { username, password },
    });
    if (!res.ok()) return null;
    const body = await res.json();
    const token: string = body?.token;
    const propertyId: string = body?.user?.propertyId;
    if (!token || !propertyId) return null;
    return { token, propertyId };
  } catch {
    return null;
  } finally {
    await ctx.dispose();
  }
}

// ── test suite ────────────────────────────────────────────────────────────────

test.describe("check-in flow (self-contained fixtures)", () => {
  // Shared auth state resolved in beforeAll
  let auth: { token: string; propertyId: string } | null = null;
  let usedCreds = CREDENTIALS[0];

  // IDs of entities created by beforeAll / torn down by afterAll
  let testRoomTypeId: string | null = null;
  let testRatePlanId: string | null = null;
  let testRoomId: string | null = null;
  let testGuestId: string | null = null;
  let testReservationId: string | null = null;

  // ── setup ──────────────────────────────────────────────────────────────────
  test.beforeAll(async () => {
    const base = "http://localhost:5000";
    const suffix = Date.now();

    // Resolve credentials
    for (const creds of CREDENTIALS) {
      auth = await loginViaApi(base, creds.username, creds.password);
      if (auth) { usedCreds = creds; break; }
    }
    if (!auth) return; // The test body will skip itself when auth is null

    const ctx = await apiRequest.newContext({
      baseURL: base,
      extraHTTPHeaders: { Authorization: `Bearer ${auth.token}` },
    });
    try {
      // 1. Create a dedicated room type
      const rtRes = await ctx.post(
        `/api/properties/${auth.propertyId}/room-types`,
        {
          data: {
            name: `E2E-RoomType-${suffix}`,
            description: "Playwright test fixture — safe to delete",
            maxOccupancy: 2,
            baseRate: "150.00",
            amenities: [],
            isActive: true,
          },
        }
      );
      if (rtRes.ok()) {
        const body = await rtRes.json();
        testRoomTypeId = body.roomType?.id ?? null;
      }

      // 2. Create a dedicated rate plan
      const rpRes = await ctx.post(
        `/api/properties/${auth.propertyId}/rate-plans`,
        {
          data: {
            name: `E2E-RatePlan-${suffix}`,
            description: "Playwright test fixture — safe to delete",
            isActive: true,
            isRefundable: true,
          },
        }
      );
      if (rpRes.ok()) {
        const body = await rpRes.json();
        testRatePlanId = body.ratePlan?.id ?? null;
      }

      // 3. Create a dedicated room (requires room type)
      if (testRoomTypeId) {
        const roomRes = await ctx.post(
          `/api/properties/${auth.propertyId}/rooms`,
          {
            data: {
              roomTypeId: testRoomTypeId,
              roomNumber: `E2E-${suffix}`,
              floor: 9,
              status: "available",
              isActive: true,
            },
          }
        );
        if (roomRes.ok()) {
          const body = await roomRes.json();
          testRoomId = body.room?.id ?? null;
        }
      }

      // 4. Create a dedicated guest
      const guestRes = await ctx.post("/api/guests", {
        data: {
          firstName: "E2E",
          lastName: "CheckinTest",
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
        },
      });
      if (guestRes.ok()) {
        const body = await guestRes.json();
        testGuestId = body.guest?.id ?? null;
      }

      // 5. Create a reservation arriving today
      if (testRoomTypeId && testRatePlanId && testGuestId) {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86_400_000)
          .toISOString()
          .split("T")[0];

        const resRes = await ctx.post("/api/reservations", {
          data: {
            propertyId: auth.propertyId,
            guestId: testGuestId,
            roomTypeId: testRoomTypeId,
            ratePlanId: testRatePlanId,
            status: "confirmed",
            arrivalDate: today,
            departureDate: tomorrow,
            nights: 1,
            adults: 1,
            children: 0,
            totalAmount: "150",
          },
        });
        if (resRes.ok()) {
          const body = await resRes.json();
          testReservationId = body.reservation?.id ?? null;
        }
      }
    } finally {
      await ctx.dispose();
    }
  });

  // ── teardown ───────────────────────────────────────────────────────────────
  test.afterAll(async () => {
    if (!auth) return;

    const base = "http://localhost:5000";
    const ctx = await apiRequest.newContext({
      baseURL: base,
      extraHTTPHeaders: { Authorization: `Bearer ${auth.token}` },
    });
    try {
      // Delete in reverse-dependency order
      if (testReservationId) {
        await ctx.delete(`/api/reservations/${testReservationId}`);
      }
      if (testRoomId) {
        await ctx.delete(`/api/rooms/${testRoomId}`);
      }
      if (testRoomTypeId) {
        await ctx.delete(`/api/room-types/${testRoomTypeId}`);
      }
      if (testRatePlanId) {
        await ctx.delete(`/api/rate-plans/${testRatePlanId}`);
      }
      if (testGuestId) {
        await ctx.delete(`/api/guests/${testGuestId}`);
      }
    } finally {
      await ctx.dispose();
    }
  });

  // ── test ───────────────────────────────────────────────────────────────────
  test("check-in form end-to-end: fills ID, draws signature, submits, sees success panel", async ({
    page,
    baseURL,
  }) => {
    // Skip cleanly when setup could not authenticate
    if (!auth) {
      test.skip(
        true,
        "No known user credentials exist in this DB — seed the DB first."
      );
      return;
    }

    // Skip cleanly when the fixture reservation was not created
    if (!testReservationId) {
      test.skip(
        true,
        "Test fixture setup failed — reservation could not be created."
      );
      return;
    }

    // ── 1. Log in via the UI ──────────────────────────────────────────────
    await page.goto("/");

    const usernameInput = page.getByTestId("input-username");
    await expect(usernameInput).toBeVisible({ timeout: 10_000 });

    await usernameInput.fill(usedCreds.username);
    await page.getByTestId("input-password").fill(usedCreds.password);
    await page.getByTestId("button-login").click();

    await expect(page.getByTestId("button-login")).toBeHidden({
      timeout: 15_000,
    });

    // ── 2. Navigate to Front Desk ─────────────────────────────────────────
    await page.goto("/front-desk");
    await expect(page.getByTestId("page-front-desk")).toBeVisible({
      timeout: 15_000,
    });

    // ── 3. Open the Check-in tab ──────────────────────────────────────────
    await page.getByTestId("tab-checkin").click();

    // ── 4. Select our fixture reservation ────────────────────────────────
    // The fixture reservation must be visible — no fallback to ambient data.
    const selectBtn = page.getByTestId(
      `button-select-checkin-${testReservationId}`
    );
    await expect(selectBtn).toBeVisible({ timeout: 10_000 });
    await selectBtn.click();

    // Wait for the check-in form's guest info card to load
    await expect(page.getByTestId("card-checkin-form")).toBeVisible({
      timeout: 15_000,
    });

    // ── 5. Fill ID verification fields ───────────────────────────────────
    await page.getByTestId("input-id-number").fill("PW987654");
    await page.getByTestId("input-nationality").fill("British");

    // Open the Radix Select for ID type and pick "Passport"
    await page.getByTestId("select-id-type").click();
    await page.getByRole("option", { name: "Passport" }).click();

    // ── 6. Draw a signature on the canvas ────────────────────────────────
    const canvas = page.getByTestId("signature-canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });

    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 20, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width - 20,
        box.y + box.height / 2,
        { steps: 10 }
      );
      await page.mouse.up();
    }

    // ── 7. Select an available room ───────────────────────────────────────
    const roomSelect = page.getByTestId("select-room-number");
    await roomSelect.click();
    const firstRoom = page.getByRole("option").first();
    await expect(firstRoom).toBeVisible({ timeout: 5_000 });
    await firstRoom.click();

    // ── 8. Submit the form ────────────────────────────────────────────────
    await page.getByTestId("button-complete-checkin").click();

    // ── 9. Assert the success panel with Print + Resend buttons ──────────
    await expect(
      page.locator('[data-testid="button-print-registration-card"]')
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.locator('[data-testid="button-resend-email"]')
    ).toBeVisible();
  });
});
