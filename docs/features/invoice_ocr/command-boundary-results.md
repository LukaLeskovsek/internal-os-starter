# Protected invoice commands — local results, 2026-10-19

The existing invoice review flow now uses mandatory PostgreSQL commands within the
existing Next.js/Supabase deployment. Local acceptance and browser verification
passed. Nothing was pushed, deployed or applied to hosted Supabase. The CI workflow
is prepared but has not run remotely.

The [accepted plan](command-boundary-plan.md) was committed first as `b6b0457`.
The implementation is `c0d97bfe8ca9630cc56e4fcda548b29e9caf1680` on `codex/invoice-command-boundary`; this evidence
commit also closes a qualification-gate issue by rejecting unqualified later invoice
migrations rather than silently skipping them.

## What changed

The command function derives the actor from the verified data-API identity and
checks current active profile, module grant and module enabled state inside the
transaction, including on replay. Ordinary authenticated, anonymous and service-role
clients cannot insert, update, delete or truncate the protected invoice tables.
Read policies also check current access. Explicit import, approve, reject, reopen
and request-bound undo replace arbitrary status changes.

Imports commit header and lines together. Decisions commit corrections, revision,
audit and replay response together. Duplicate requests replay once; changed inputs
under the same request ID fail. Competing decisions have one winner. Undo targets
the latest same-actor command at its returned revision and cannot revive an invalid
legacy approval. Approval retains the existing vendor/amount minimum, rejection
requires a reason, and self-approval with the module grant remains allowed. Zero
amounts, credit notes and incomplete drafts remain supported.

The interface keeps its upload, review, keyboard, next-invoice and CSV patterns.
Decided records require reopening before editing. Server-issued request IDs avoid
hydration mismatches. Browser testing found and fixed a form-remount bug that
otherwise discarded the successful action callback and prevented queue navigation.

## Observed evidence

| Check | Result |
|---|---|
| Independent HTTP/raw-SQL acceptance | 18/18 groups passed |
| Restored reference after mutation controls | Same 18/18 passed again |
| Actual TypeScript actions through PostgREST/PG | 6/6 integration groups passed |
| Weakened approval guard / restored direct write privileges | Both detected |
| Unknown later invoice migration | Rejected before containers/database changes |
| Legacy invoice and line upgrade; repeated migration | Preserved and passed |
| Existing local AI-routing regressions | 19/19 passed |
| Types, lint and clean production build | Passed |
| Containers, anonymous volume and network cleanup | Verified removed |

These are scenario groups, not 36 different workflows or AI assignments. The
oracles use independent HTTP/SQL observations and import no product validators.
The same author wrote implementation and tests; this is not external authorship,
a held-out benchmark, a full security audit or proof of lower agent time/cost.

Browser checks used the actual Next.js UI, actions, PostgREST and PostgreSQL with
explicitly synthetic identity/file adapters and keyless demo OCR. Observed: three
uploads -> three pending invoices and six lines; one A key -> approval and a different
next invoice; missing vendor/reason -> Slovenian field errors; corrected approval
and undo -> corrections retained; rejection -> persisted reason in CSV. The fixture
ended with four invoices/eight lines across both intake exercises. The owner access
grid revoked/restored the member's grant, the member's launcher/direct route reflected
it, and the member could not open administration. A separate palette check exposed
only invoice navigation/actions plus account/theme controls.

Phone width 390 and desktop width 1440 were inspected in both themes. No horizontal
overflow was observed at 390 px. The original-file preview was a deliberately tiny
synthetic image; this does not qualify real PDF/OCR legibility. Browser output had
no observed application errors, with development CSS-preload warnings after repeated
navigation. Build retained the documented Supabase Edge Runtime warning; lint reports
the existing `next lint` deprecation. Neither was suppressed.

[Desktop light](../../../artifacts/invoice-browser-01/review-desktop-light.png) ·
[Desktop dark](../../../artifacts/invoice-browser-01/review-desktop-dark.png) ·
[Phone light](../../../artifacts/invoice-browser-01/review-mobile-light.png) ·
[Phone dark](../../../artifacts/invoice-browser-01/review-mobile-dark.png)

## Provenance and reproduction

[Final raw result](../../../artifacts/invoice-qualification-07-final/result.json),
[browser cleanup](../../../artifacts/invoice-browser-01/cleanup.json), and
[reproduction/deployment boundaries](../../../tests/invoice-acceptance/README.md).
Ignored artifacts retain preparatory runs separately: the initial database-readiness
failure, response-classification/timeout failures, earlier successful drafts, and
superseded final runs. They were not overwritten or counted as agent benchmark repairs.
Preparatory run 02 was not source-bound and is diagnostic only.

- Qualified source tree: `b3270e38a27ebdf5fcb352d1edc34e8133f7cdf2e683dacb3a2c127947074a23`
- Migration: `1bac89320750229d5b855ffd11027d42b36749acf5758014fd9e11eea52f8437`
- Oracle/controller: `bd6fe3e180141277f91b236b503d2bcd82d072a2182abe3341b98f1ee6e68ed5`
- Source unchanged during final run: `True`
- Final qualification: 14.434 seconds, including fixtures/controls/cleanup;
  this is test runtime, not agent performance.

The source digest covers invoice module files, core migrations and invoice acceptance
files. Image identities are in the raw result. Product files in the clean build
checkout were compared byte-for-byte with the repository; the build used explicit
nonproduction configuration and no project environment files. The only subsequent
source change was the independently qualified test-controller inventory guard.

## What this supports and what remains

This demonstrates an enforceable invoice runtime boundary using the existing
platform. Business semantics are still trusted handwritten SQL. It is not a general
business compiler or a sandbox for a coding agent that also controls migrations,
DDL, tests or deployment permissions. Those remain operator authority; protecting
release admission is separate work. No claim of fewer total lines or better AI
engineering follows from moving logic from TypeScript into SQL.

File storage and database commits remain separate systems: cleanup is attempted and
failure is logged. Linked originals are protected by storage policies, while already
issued signed URLs retain their expiry behavior. Historical invoices start at revision
zero without invented historical audit events. Cloud Auth/Storage, real OCR, production
upgrade/backup/rollback and hosted operation require a separately authorized rollout.

The next compiler experiment should derive and reuse the command obligations for a
second real workflow and compare full change tasks against the existing strong
baseline. Repeating invoice-specific SQL in another module would not establish that
benefit. Ash remains a separate evaluated engine candidate; no Ash service was added.
