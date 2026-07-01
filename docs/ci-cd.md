# CI/CD

Lorecraft keeps its CI/CD policy in this file so the repository is self-contained.

## Branch Flow

- `main` is the production branch.
- `develop` is the integration branch and the GitHub default branch.
- Routine work branches start from `develop` and use:
  - `change/<short-slug>` for planned product, UX, architecture, or feature changes.
  - `fix/<short-slug>` for defects and regressions.
  - `misc/<short-slug>` for chores, tooling, documentation, process, infrastructure, and low-risk maintenance.
- Routine integration may merge locally into `develop` after TH review or equivalent local verification.
- Promotion to `main` should use a remote release PR by default.

## Required Gate

The cheap required gate is:

```bash
npm run ci:required
```

It runs:

- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

The GitHub Actions workflow runs this gate on pushes to `main`, `develop`, `change/**`, `fix/**`, and `misc/**`, plus pull requests into `main` or `develop`.

## Optional Checks

These checks are useful locally or during release, but they are not part of the required hosted CI gate yet:

- `npm run convex:once`
- `npx convex codegen`
- `npm run e2e:install`
- `npm run e2e`
- Manual browser playtests against `npm run dev`
- Provider-backed Game Master playtests with Ollama or another OpenAI-compatible endpoint

`npm run e2e` is the deterministic browser check. It starts a local fixture OpenAI-compatible provider and a debug-enabled local app stack on test ports so Playwright can exercise the real browser, Next route, Convex state, and provider adapter without requiring a live LLM or stopping an existing normal dev server.

Keep provider-backed and browser checks optional until they are stable, cheap, and have isolated non-production resources. Promote deterministic E2E to a required hosted gate only after it proves reliable enough for routine branch protection.

## Secrets And Configuration

Required CI does not need LLM provider secrets or Convex deployment credentials. The hosted workflow sets a non-secret placeholder `NEXT_PUBLIC_CONVEX_URL` so `next build` can initialize the Convex browser client without connecting to a real deployment.

Local and deployment-only secrets must stay in ignored `.env*` files, GitHub repository secrets, Vercel environment variables, or provider-specific secret stores. Never print API keys, generated tokens, full environment dumps, or provider credentials in workflow logs.

## Branch Protection

Recommended GitHub protection:

- Protect `main`.
- Require a pull request before merging into `main`.
- Require the `Required CI` status check.
- Require conversation resolution.
- Block force pushes.
- Block branch deletion.

`develop` may continue using local TH review and verification for routine solo-maintained integration unless this project later chooses to require remote PRs into `develop`.

## Deployment

Production deployment is not wired yet.

Before production deployment exists, add or update `docs/deployment.md` with:

- production deployment trigger
- preview deployment behavior
- required secrets, without values
- environment protection rules
- rollback approach
- smoke checks after deployment
- manual fallback path
