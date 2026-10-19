# Invoice command boundary — accepted slice, 2026-10-19

The accountant reviews an extracted invoice, corrects it, and makes one decision.
The existing review queue, Slovenian copy, one-key decision, private files and CSV
export remain. Self-approval remains allowed for an active user granted this module;
each user still works only with their own invoices.

The user selected the existing Next.js/Supabase/PostgreSQL deployment, rather than
adding an Ash service. This applies the resource/action lesson from the Ash trial;
it is not an Ash integration or a new general-purpose compiler.

## End-to-end slice

1. Upload the original and extract a draft with the existing AI adapter. Import the
   header and all supplied lines in one database transaction; any failure rejects
   the import and the action attempts to remove the uploaded original.
2. Review prefilled fields. One explicit approve/reject command atomically saves
   corrections, increments the revision and records the authenticated actor.
3. Continue to the next invoice. Reopen and undo remain available as explicit
   commands. Undo references the last successful request and its revision; it never
   accepts an arbitrary target status. Corrections remain saved when undoing.
4. Refresh or export: the result persists. Errors leave all business records intact.

## Mandatory boundary

PostgreSQL owns access checks (signed-in, active, module granted and enabled), row
ownership, closed command shapes, allowed transitions, required business fields,
revision checks, idempotency and audit. The browser/Next.js process supplies no
actor or target status. Ordinary authenticated/anonymous/service-role data-API
clients cannot mutate protected invoice, line-item, request or audit tables.
Only the command function can write them. Select policies also check current access.
Storage policies check current access and path ownership.

The migration/schema owner and a trusted deployment operator remain privileged.
Restricting ordinary application credentials is not a sandbox for someone allowed
to replace migrations, function definitions or deployment configuration.

Keep changes inside invoice_ocr plus its evidence/tests and package test commands.
Existing core migrations, other modules, identity helpers and deployment stay intact.
Apply only to isolated local test databases in this work; hosted rollout needs a
separate approved deployment. Existing deployments must apply the new migration
before serving the new actions; old writers will then fail closed.

## Acceptance requirements frozen before implementation

- Empty/minimal and multi-line imports; exact stored values; header/lines atomic.
- Approve with vendor + amount; reject with a reason; retain the existing minimum
  business requirements. Do not invent accounting balancing or positive-only rules
  (credit notes and incomplete OCR drafts remain valid).
- Reopen decided invoices; undo only the latest same-actor command at its returned
  revision; reject arbitrary status targets and invalid terminal transitions.
- Missing, stale and malformed revisions fail. Retry identical request IDs returns
  the same response once; conflicting reuse fails. Access is checked before replay.
- Concurrent competing decisions: one winner. Concurrent identical retries: one
  business change and one audit entry.
- Revoked grant, disabled profile/module, anonymous and foreign-owner requests fail
  without row or audit changes, including direct data-API writes and replay.
- Required audit/request write failure rolls back the command. Invalid child rows
  roll back the entire import. Infrastructure failures remain failures.
- Test an upgrade with existing invoices/lines and repeat migration application.
- Exercise the actual TypeScript action adapters and undo wiring in addition to
  HTTP/SQL boundary tests. Run existing local-AI regressions, types, lint and build.
- Independent acceptance consumes HTTP and raw SQL, never product validators or
  helpers. Same author is disclosed; this is not external independent authorship.
- Mutation controls: weakened approval requirements and restored direct-write
  privileges must be rejected; restore the reference and rerun.

## Evidence and decision

Record commands, inventories, source/image identities and scoped cleanup. Report
API/database proof separately from browser proof and hosted deployment. No AI
productivity, security-audit or broad ERP expressiveness claim follows from this
slice. A later fair change-task comparison must count SQL, TypeScript, tests and
operational cost. No push or live database changes are included.
