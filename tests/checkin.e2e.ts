/**
 * Playwright end-to-end test: full check-in flow.
 *
 * The test:
 *  1. Logs in as front-desk staff via the Login page.
 *  2. Creates a test guest + reservation for today via the API (so we always
 *     have a predictable arrival to work with regardless of DB state).
 *  3. Opens Front Desk → Check-in tab.
 *  4. Selects that arrival.
 *  5. Fills the ID verification fields.
 *  6. Draws a signature on the canvas.
 *  7. Selects an available room.
 *  8. Submits the form.
 *  9. Asserts the success panel appears and both "Print Registration Card" and
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

async function createTestReservation(
  baseURL: string,
  token: string,
  propertyId: string
): Promise<string | null> {
  const ctx = await apiRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  try {
    // Create guest
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
    if (!guestRes.ok()) return null;
    const { guest } = await guestRes.json();

    // Discover the first room type available for this property
    const rtRes = await ctx.get(`/api/properties/${propertyId}/room-types`);
    const rtBody = rtRes.ok() ? await rtRes.json() : {};
    const roomTypeId: string = rtBody.roomTypes?.[0]?.id ?? "rt-standard";

    // Discover the first rate plan available for this property
    const rpRes = await ctx.get(`/api/properties/${propertyId}/rate-plans`);
    const rpBody = rpRes.ok() ? await rpRes.json() : {};
    const ratePlanId: string = rpBody.ratePlans?.[0]?.id ?? "rp-standard";

    // Create reservation for today
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

    const resRes = await ctx.post("/api/reservations", {
      data: {
        propertyId,
        guestId: guest.id,
        roomTypeId,
        ratePlanId,
        status: "confirmed",
        arrivalDate: today,
        departureDate: tomorrow,
        nights: 1,
        adults: 1,
        children: 0,
        totalAmount: "100",
      },
    });
    if (!resRes.ok()) return null;
    const { reservation } = await resRes.json();
    return reservation?.id ?? null;
  } catch {
    return null;
  } finally {
    await ctx.dispose();
  }
}

// ── test ─────────────────────────────────────────────────────────────────────

test("check-in form end-to-end: fills ID, draws signature, submits, sees success panel", async ({
  page,
  baseURL,
}) => {
  const base = baseURL ?? "http://localhost:5000";

  // ── 1. Resolve credentials ────────────────────────────────────────────────
  let auth: { token: string; propertyId: string } | null = null;
  let usedCreds = CREDENTIALS[0];

  for (const creds of CREDENTIALS) {
    auth = await loginViaApi(base, creds.username, creds.password);
    if (auth) { usedCreds = creds; break; }
  }

  if (!auth) {
    test.skip(true, "No known user credentials exist in this DB — seed the DB first.");
    return;
  }

  // ── 2. Create a reservation arriving today ────────────────────────────────
  const reservationId = await createTestReservation(base, auth.token, auth.propertyId);

  // ── 3. Log in via the UI ──────────────────────────────────────────────────
  await page.goto("/");

  // The app shows a login form even on protected pages (client-side guard).
  // Wait for the username field to be ready.
  const usernameInput = page.getByTestId("input-username");
  await expect(usernameInput).toBeVisible({ timeout: 10_000 });

  await usernameInput.fill(usedCreds.username);
  await page.getByTestId("input-password").fill(usedCreds.password);
  await page.getByTestId("button-login").click();

  // After login the login form should disappear and the app renders the main UI.
  // Wait for the login button (or form) to be gone — signals successful auth.
  await expect(page.getByTestId("button-login")).toBeHidden({ timeout: 15_000 });

  // ── 4. Navigate to Front Desk ─────────────────────────────────────────────
  await page.goto("/front-desk");
  await expect(page.getByTestId("page-front-desk")).toBeVisible({ timeout: 15_000 });

  // ── 5. Open the Check-in tab ──────────────────────────────────────────────
  await page.getByTestId("tab-checkin").click();

  // ── 6. Select a reservation to check in ──────────────────────────────────
  let selectedReservationId = reservationId;

  if (reservationId) {
    const selectBtn = page.getByTestId(`button-select-checkin-${reservationId}`);
    const visible = await selectBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (visible) {
      await selectBtn.click();
    } else {
      // Fall back to first arrival in the list
      const first = page.locator('[data-testid^="button-select-checkin-"]').first();
      await expect(first).toBeVisible({ timeout: 10_000 });
      selectedReservationId = await first.getAttribute("data-testid").then(
        (id) => id?.replace("button-select-checkin-", "") ?? null
      );
      await first.click();
    }
  } else {
    // No reservation was created — pick whatever is in the arrivals list
    const first = page.locator('[data-testid^="button-select-checkin-"]').first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    await first.click();
  }

  // Wait for the check-in form's guest info card to load
  await expect(page.getByTestId("card-checkin-form")).toBeVisible({ timeout: 15_000 });

  // ── 7. Fill ID verification fields ───────────────────────────────────────
  await page.getByTestId("input-id-number").fill("PW987654");
  await page.getByTestId("input-nationality").fill("British");

  // Open the Radix Select for ID type and pick "Passport"
  await page.getByTestId("select-id-type").click();
  await page.getByRole("option", { name: "Passport" }).click();

  // ── 8. Draw a signature on the canvas ────────────────────────────────────
  const canvas = page.getByTestId("signature-canvas");
  await expect(canvas).toBeVisible({ timeout: 5_000 });

  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
  }

  // ── 9. Select an available room ───────────────────────────────────────────
  const roomSelect = page.getByTestId("select-room-number");
  await roomSelect.click();
  const firstRoom = page.getByRole("option").first();
  await expect(firstRoom).toBeVisible({ timeout: 5_000 });
  await firstRoom.click();

  // ── 10. Submit the form ───────────────────────────────────────────────────
  await page.getByTestId("button-complete-checkin").click();

  // ── 11. Assert the success panel with Print + Resend buttons ──────────────
  // The AlertTitle has class text-green-800 and contains "Check-In Complete"
  await expect(
    page.locator('[data-testid="button-print-registration-card"]')
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    page.locator('[data-testid="button-resend-email"]')
  ).toBeVisible();
});
