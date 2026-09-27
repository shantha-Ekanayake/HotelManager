---
name: Historical data backfills
description: Why schema publishing alone cannot update historical application records.
---

Data-only changes to existing records need a path that runs against the production database; schema synchronization alone does not replay updates to rows.

**Why:** Replit's managed database publish flow diffs schema, not application data. A backfill performed only in development leaves historical production records unchanged.

**How to apply:** For future data-only backfills, use a narrow idempotent operation in an explicitly deployed app path, and test that rerunning it preserves already-classified rows and unrelated records. Do not put production schema changes in application startup.