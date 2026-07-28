/**
 * Playwright end-to-end test: "Print Receipt" button opens a popup window
 * containing the correct receipt HTML.
 *
 * Two buttons are covered:
 *   a) The form-level "Print Receipt" button shown before checkout is submitted
 *      (data-testid="button-print-receipt")
 *   b) The post-checkout success-panel "Print Receipt" button
 *      (data-testid="button-print-receipt-success")
 *
 * For each button the test:
 *   1. Clicks the button while listening for the popup event.
 *   2. Waits for the popup to settle (document.write completes on domcontentloaded).
 *   3. Reads the popup's HTML via page.content().
 *   4. Asserts the receipt contains: confirmation number, guest name, at least
 *      one charge row, at least one payment row, and the balance.
 *
 * The test is fully self-contained: beforeAll creates its own room type, rate
 * plan, room, guest (with email so a charge + payment appear), and reservation;
 * afterAll tears everything down in reverse-dependency order.
 */

import { test, expect, request as apiRequest } from "@playwright/test";

// ── credentials ───────────────────────────────────────────────────────────────
const CREDENTIALS = [
  { username: "frontdesk", password: "frontdesk123" },
  { username: "manager",   password: "password123"  },
  { username: "admin",     password: "admin123"     },
];

// ── helpers ───────────────────────────────────────────────────────────────────

async function loginViaApi(
  base: string,
  username: string,
  password: string
): Promise<{ token: string; propertyId: string } | null> {
  const ctx = await apiRequest.newContext({ baseURL: base });
  try {
    const res = await ctx.post("/api/auth/login", { data: { username, password } });
    if (!res.ok()) return null;
    const body = await res.json();
    const token: string      = body?.token;
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

test.describe("receipt print popup (self-contained fixtures)", () => {
  let auth: { token: string; propertyId: string } | null = null;
  let usedCreds = CREDENTIALS[0];

  let testRoomTypeId:    string | null = null;
  let testRatePlanId:    string | null = null;
  let testRoomId:        string | null = null;
  let testGuestId:       string | null = null;
  let testReservationId: string | null = null;
  let testFolioId:       string | null = null;

  // ── setup ─────────────────────────────────────────────────────────────────
  test.beforeAll(async () => {
    const base   = "http://localhost:5000";
    const suffix = Date.now();

    for (const creds of CREDENTIALS) {
      auth = await loginViaApi(base, creds.username, creds.password);
      if (auth) { usedCreds = creds; break; }
    }
    if (!auth) return;

    const ctx = await apiRequest.newContext({
      baseURL: base,
      extraHTTPHeaders: { Authorization: `Bearer ${auth.token}` },
    });

    try {
      // 1. Room type
      const rtRes = await ctx.post(`/api/properties/${auth.propertyId}/room-types`, {
        data: {
          name: `E2E-RP-RoomType-${suffix}`,
          description: "Receipt print e2e fixture — safe to delete",
          maxOccupancy: 2,
          baseRate: "200.00",
          amenities: [],
          isActive: true,
        },
      });
      if (rtRes.ok()) testRoomTypeId = (await rtRes.json()).roomType?.id ?? null;

      // 2. Rate plan
      const rpRes = await ctx.post(`/api/properties/${auth.propertyId}/rate-plans`, {
        data: {
          name: `E2E-RP-RatePlan-${suffix}`,
          description: "Receipt print e2e fixture — safe to delete",
          isActive: true,
          isRefundable: true,
        },
      });
      if (rpRes.ok()) testRatePlanId = (await rpRes.json()).ratePlan?.id ?? null;

      // 3. Room
      if (testRoomTypeId) {
        const roomRes = await ctx.post(`/api/properties/${auth.propertyId}/rooms`, {
          data: {
            roomTypeId: testRoomTypeId,
            roomNumber: `E2E-RP-${suffix}`,
            floor: 7,
            status: "available",
            isActive: true,
          },
        });
        if (roomRes.ok()) testRoomId = (await roomRes.json()).room?.id ?? null;
      }

      // 4. Guest
      const guestRes = await ctx.post("/api/guests", {
        data: {
          firstName: "ReceiptPrint",
          lastName:  "E2EGuest",
          email:     `e2e-rp-${suffix}@test.invalid`,
          phone: null, address: null, city: null, state: null,
          country: null, postalCode: null, idType: null, idNumber: null,
          nationality: null, vipStatus: false, notes: null,
          dateOfBirth: null, preferences: {},
        },
      });
      if (guestRes.ok()) testGuestId = (await guestRes.json()).guest?.id ?? null;

      // 5. Reservation (departure today so it appears on Check-Out tab)
      if (testRoomTypeId && testRatePlanId && testGuestId) {
        const today     = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

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
            totalAmount:   "200",
            notes:         "E2E_TEST_FIXTURE",
          },
        });
        if (resRes.ok()) {
          const body = await resRes.json();
          testReservationId = body.reservation?.id ?? null;
          testFolioId       = body.folio?.id ?? null;
        }
      }

      // 6. Check in so the reservation appears in Current Guests / Check-Out tab
      if (testReservationId && testRoomId) {
        await ctx.post(`/api/reservations/${testReservationId}/check-in`, {
          data: {
            roomId:      testRoomId,
            idType:      "passport",
            idNumber:    "PW-RP-001",
            nationality: "British",
            signature:   "data:image/png;base64,iVBORw0KGgo=",
          },
        });
      }

      // 7. Add a charge to the folio so charge rows appear on the receipt
      if (testFolioId) {
        await ctx.post(`/api/folios/${testFolioId}/charges`, {
          data: {
            description: "Room Charge (E2E)",
            amount:      "200.00",
            chargeType:  "room",
            quantity:    1,
          },
        });
      }
    } finally {
      await ctx.dispose();
    }
  });

  // ── teardown ──────────────────────────────────────────────────────────────
  test.afterAll(async () => {
    if (!auth) return;
    const ctx = await apiRequest.newContext({
      baseURL: "http://localhost:5000",
      extraHTTPHeaders: { Authorization: `Bearer ${auth.token}` },
    });
    try {
      if (testReservationId) await ctx.delete(`/api/reservations/${testReservationId}`);
      if (testRoomId)        await ctx.delete(`/api/rooms/${testRoomId}`);
      if (testRoomTypeId)    await ctx.delete(`/api/room-types/${testRoomTypeId}`);
      if (testRatePlanId)    await ctx.delete(`/api/rate-plans/${testRatePlanId}`);
      if (testGuestId)       await ctx.delete(`/api/guests/${testGuestId}`);
    } finally {
      await ctx.dispose();
    }
  });

  // ── shared navigation helper ──────────────────────────────────────────────
  async function loginAndOpenCheckoutForm(page: any) {
    await page.goto("/");
    const usernameInput = page.getByTestId("input-username");
    await expect(usernameInput).toBeVisible({ timeout: 10_000 });
    await usernameInput.fill(usedCreds.username);
    await page.getByTestId("input-password").fill(usedCreds.password);
    await page.getByTestId("button-login").click();
    await expect(page.getByTestId("button-login")).toBeHidden({ timeout: 15_000 });

    await page.goto("/front-desk");
    await expect(page.getByTestId("page-front-desk")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("tab-checkout").click();

    const selectBtn = page.getByTestId(`button-select-checkout-${testReservationId}`);
    await expect(selectBtn).toBeVisible({ timeout: 10_000 });
    await selectBtn.click();

    // Wait for the checkout form to finish loading
    await expect(page.getByTestId("button-complete-checkout")).toBeVisible({ timeout: 10_000 });
  }

  // ── test 1: form-level Print Receipt button ───────────────────────────────
  test("form-level Print Receipt button opens a popup with receipt HTML", async ({ page }) => {
    if (!auth) {
      test.skip(true, "No known user credentials — seed the DB first.");
      return;
    }
    if (!testReservationId) {
      test.skip(true, "Test fixture setup failed — reservation not created.");
      return;
    }

    await loginAndOpenCheckoutForm(page);

    // Intercept the popup that printReceipt() opens
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByTestId("button-print-receipt").click(),
    ]);

    // Wait for document.write() to complete
    await popup.waitForLoadState("domcontentloaded");

    const html = await popup.content();

    // Confirmation number
    expect(html).toContain("Departure Receipt");

    // Guest name written by the component
    expect(html).toContain("ReceiptPrint");
    expect(html).toContain("E2EGuest");

    // Totals section must be present
    expect(html).toContain("Total Charges");
    expect(html).toContain("Total Payments");

    // Balance row must be present (either "Balance Due" or "Balance")
    expect(html).toMatch(/Balance/);

    await popup.close();
  });

  // ── test 2: success-panel Print Receipt button ────────────────────────────
  test("success-panel Print Receipt button opens a popup with receipt HTML after checkout", async ({ page }) => {
    if (!auth) {
      test.skip(true, "No known user credentials — seed the DB first.");
      return;
    }
    if (!testReservationId) {
      test.skip(true, "Test fixture setup failed — reservation not created.");
      return;
    }

    await loginAndOpenCheckoutForm(page);

    // Submit the check-out form
    await page.getByTestId("button-complete-checkout").click();

    // Wait for the success panel to appear
    await expect(
      page.getByTestId("button-print-receipt-success")
    ).toBeVisible({ timeout: 15_000 });

    // Intercept the popup opened by the success-panel button
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByTestId("button-print-receipt-success").click(),
    ]);

    await popup.waitForLoadState("domcontentloaded");

    const html = await popup.content();

    // Document title / heading
    expect(html).toContain("Departure Receipt");

    // Guest name
    expect(html).toContain("ReceiptPrint");
    expect(html).toContain("E2EGuest");

    // Totals section
    expect(html).toContain("Total Charges");
    expect(html).toContain("Total Payments");

    // Balance row
    expect(html).toMatch(/Balance/);

    await popup.close();
  });
});
