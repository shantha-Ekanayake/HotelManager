import { describe, expect, it } from "vitest";
import { Pool } from "@neondatabase/serverless";
import { backfillFailedCommunicationsSql } from "../server/backfill-failed-communications";

describe.skipIf(!process.env.DATABASE_URL)("historical email failure backfill", () => {
  it("updates only unclassified outbound email failures and is safe to rerun", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Temporary table shadows the real table for this connection. No real
      // communications are changed by this test.
      await client.query(`
        CREATE TEMP TABLE guest_communications (
          id text PRIMARY KEY,
          type text NOT NULL,
          direction text NOT NULL,
          subject text,
          content text NOT NULL,
          status text
        ) ON COMMIT DROP
      `);
      await client.query(`
        INSERT INTO guest_communications (id, type, direction, subject, content, status) VALUES
          ('subject', 'email', 'outbound', 'Receipt [FAILED]', 'SMTP error', NULL),
          ('content', 'email', 'outbound', 'Receipt', 'Email delivery failed during check-out.', NULL),
          ('resend', 'email', 'outbound', 'Receipt', 'Resend of departure receipt email failed.', NULL),
          ('sent', 'email', 'outbound', 'Receipt [FAILED]', 'Error', 'sent'),
          ('skipped', 'email', 'outbound', 'Receipt [FAILED]', 'Error', 'skipped'),
          ('plain', 'email', 'outbound', 'Receipt', 'Delivered successfully.', NULL),
          ('discussion', 'email', 'outbound', 'Follow-up about [FAILED] deliveries', 'The prior delivery failed, but this message was sent.', NULL),
          ('inbound', 'email', 'inbound', 'Receipt [FAILED]', 'Error', NULL),
          ('phone', 'phone', 'outbound', 'Receipt [FAILED]', 'Error', NULL)
      `);

      const first = await client.query(backfillFailedCommunicationsSql);
      expect(first.rowCount).toBe(3);
      const second = await client.query(backfillFailedCommunicationsSql);
      expect(second.rowCount).toBe(0);
      const rows = await client.query("SELECT id, status FROM guest_communications ORDER BY id");
      expect(Object.fromEntries(rows.rows.map(({ id, status }) => [id, status]))).toEqual({
        content: "failed",
        discussion: null,
        inbound: null,
        phone: null,
        plain: null,
        resend: "failed",
        sent: "sent",
        skipped: "skipped",
        subject: "failed",
      });
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  });
});