/**
 * Playwright end-to-end test: full check-out flow.
 *
 * The test is fully self-contained: beforeAll creates its own room type,
 * rate plan, room, guest, and reservation — then checks the reservation in
 * via the API so it is ready for the checkout UI flow.
 * afterAll tears everything down in reverse-dependency order.
 *
 * The test:
 *  1. Logs in as front-desk staff via the Login page.
 *  2. Opens Front Desk → Check-Out tab.
 *  3. Selects the departing guest created in beforeAll.
 *  4. Submits the check-out form.
 *  5. Asserts the "Check-Out Complete" alert and "Resend Receipt Email"
 *     button are visible in the success panel.
 */

import { test, expect, request as apiRequest } from "@playwright/test";

// ── credentials (must match what the DB seed created) ───────────────────────
const CREDENTIALS = [
  { username: "frontdesk", password: "frontdesk123" },
  { username: "manager",   password: "password123"  },
  { username: "admin",     password: "admin123"     },
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
    const token: string    = body?.token;
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

test.describe("check-out flow (self-contained fixtures)", () => {
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
    const base   = "http://localhost:5000";
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
            name: `E2E-CO-RoomType-${suffix}`,
            description: "Playwright checkout test fixture — safe to delete",
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
            name: `E2E-CO-RatePlan-${suffix}`,
            description: "Playwright checkout test fixture — safe to delete",
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
              roomNumber: `E2E-CO-${suffix}`,
              floor: 8,
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
          lastName: "CheckoutTest",
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

      // 5. Create a reservation with departure date today
      if (testRoomTypeId && testRatePlanId && testGuestId) {
        const today     = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86_400_000)
          .toISOString()
          .split("T")[0];

        const resRes = await ctx.post("/api/reservations", {
          data: {
            propertyId:    auth.propertyId,
            guestId:       testGuestId,
            roomTypeId:    testRoomTypeId,
            ratePlanId:    testRatePlanId,
            status:        "confirmed",
            arrivalDate:   yesterday,
            departureDate: today,
            nights:        1,
            adults:        1,
            children:      0,
            totalAmount:   "150",
          },
        });
        if (resRes.ok()) {
          const body = await resRes.json();
          testReservationId = body.reservation?.id ?? null;
        }
      }

      // 6. Check the reservation in via the API so it appears in the
      //    "current guests" list and the Check-Out tab.
      if (testReservationId && testRoomId) {
        await ctx.post(
          `/api/reservations/${testReservationId}/check-in`,
          {
            data: {
              roomId:     testRoomId,
              idType:     "passport",
              idNumber:   "PW000001",
              nationality: "British",
              signature:  "data:image/png;base64,iVBORw0KGgo=",
            },
          }
        );
      }
    } finally {
      await ctx.dispose();
    }
  });

  // ── teardown ───────────────────────────────────────────────────────────────
  test.afterAll(async () => {
    if (!auth) return;

    const base = "http://localhost:5000";
    const ctx  = await apiRequest.newContext({
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
  test("check-out form end-to-end: selects departing guest, submits, sees success panel", async ({
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

    // Skip cleanly when the fixture reservation was not created / checked-in
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

    // ── 3. Open the Check-Out tab ─────────────────────────────────────────
    await page.getByTestId("tab-checkout").click();

    // ── 4. Select our fixture reservation ────────────────────────────────
    const selectBtn = page.getByTestId(
      `button-select-checkout-${testReservationId}`
    );
    await expect(selectBtn).toBeVisible({ timeout: 10_000 });
    await selectBtn.click();

    // ── 5. Submit the check-out form ──────────────────────────────────────
    const completeBtn = page.getByTestId("button-complete-checkout");
    await expect(completeBtn).toBeVisible({ timeout: 10_000 });
    await completeBtn.click();

    // ── 6. Assert the success panel ───────────────────────────────────────
    // "Check-Out Complete" alert title
    await expect(
      page.getByText("Check-Out Complete", { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    // "Resend Receipt Email" button
    await expect(
      page.locator('[data-testid="button-resend-receipt-email"]')
    ).toBeVisible({ timeout: 5_000 });
  });
});
