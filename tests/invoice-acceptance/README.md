# Protected invoice acceptance

Run from the repository root, with Docker, Python 3 and installed Node dependencies:

```sh
npm run test:invoice -- --out artifacts/invoice-qualification-new
```

Choose a new output directory every time. Reports are ignored, never overwritten.
The controller creates one isolated Docker network, a PostgreSQL 17 database and a
versioned PostgREST container bound only to loopback. It builds minimal Supabase
auth/storage fixture schemas, applies the actual core and invoice migrations,
checks a legacy-data upgrade and applies the new migration twice.

The HTTP/raw-SQL oracle imports no product validation or command helpers. Tests
check business outcomes, authority, direct table writes, revision/replay,
concurrency, atomic import, undo, storage policies and rollback. Actual weakened
SQL definitions must fail their selected tests; the restored reference runs again.
The TypeScript actions are then exercised through the real PostgREST client and
database. Their auth context, OCR and file-upload adapters are explicit fixtures.
No LLM, hosted Supabase account or production data is used. The same author wrote
product and tests; independence here means separate implementation and external
observations, not external authorship or a held-out AI benchmark.

The result records the tested migration, oracle and source tree digests, images,
test inventories and cleanup. Source changes during a run make its status unknown.
An infrastructure exception or incomplete setup cannot become a passing result.
Teardown removes only this run's containers, anonymous database volume and network.

For manual browser verification against the actual Next.js app:

```sh
python3 tests/invoice-acceptance/ui.py --out artifacts/invoice-browser-new
```

It prints a loopback app URL and synthetic credentials. The real UI, server actions,
PostgREST and PostgreSQL run together; identity and file bytes are a small local
fixture, and OCR uses the existing clearly labelled keyless demo mode. No secrets
are loaded from the app's `.env.local`: the child receives an explicit environment.
Use a clean temporary checkout without environment files for this fixture, since
Next.js itself loads project environment files. Stop with Ctrl-C; cleanup is
recorded. This is not a hosted Supabase Auth/Storage qualification.

## Deployment boundary

The application schema/migration owner is trusted. Ordinary `anon`, `authenticated`
and `service_role` data-API roles have no invoice-table mutation privileges. The
only granted write operation is `invoice_ocr_execute` for an authenticated actor.
The function checks live profile/module/grant state and derives the actor itself.
Keep migration, DDL and privileged database credentials outside module code.

The migration is additive and retains existing invoice/line values. Existing rows
start at revision zero; it does not invent historical audit entries. Inspect and
back up the target database before a separately authorized rollout. Apply the
invoice migrations in order, then publish the matching actions. Between those
steps old writers fail closed. Never add a raw-write fallback or weaken privileges
to make an old application revision work; rollback needs a reviewed forward repair
or restoration of the matching application/database state.

Database import is atomic, while file storage is a separate system. The action
attempts compensation on failure and logs a failed removal; it cannot promise a
distributed transaction. Linked originals cannot be updated/deleted through the
ordinary storage policies. Already issued signed file URLs retain their existing
expiry behavior. No payment/export delivery worker or accounting policy is added.
