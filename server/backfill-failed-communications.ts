import { sql } from "drizzle-orm";
import { db } from "./db";

// Data-only migration: Drizzle schema sync / Publish does not copy changes to
// existing rows from development to production. Run before serving requests in
// both environments; the NULL guard makes subsequent starts no-ops.
export const backfillFailedCommunicationsSql = `
  UPDATE guest_communications
  SET status = 'failed'
  WHERE status IS NULL
    AND type = 'email'
    AND direction = 'outbound'
    AND (
      subject LIKE '% [FAILED]'
      OR content ILIKE 'Email delivery failed%'
      OR content ILIKE 'Resend of % email failed%'
    )
`;

export async function backfillFailedCommunications(): Promise<void> {
  await db.execute(sql.raw(backfillFailedCommunicationsSql));
}