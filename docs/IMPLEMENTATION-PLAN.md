# Modernization implementation plan

This checklist keeps infrastructure changes, security fixes, API dependency upgrades, and client modernization in separate reviewable stages.

Last updated: 1 September 2026

## Current position

- Production API is running successfully as a Docker service on Render at commit `1cdb0be`.
- Render health checks are configured at `/health` and currently pass with MongoDB connected.
- Both Stage 2 security patches are deployed, including the admin-exposure, rate-limit, and focused route-test changes.
- The production API now has the Google web client ID required for verified Google sign-in.
- Render's native GitHub auto-deploy integration does not currently have repository access; production deployments are manual by user decision.
- The API now uses Mongoose 8.24.4 and the upgrade is verified locally and in production.
- The API now uses Cloudinary 2.11.0 and Multer 2.3.0; the upgrade is verified locally and in production, including an authenticated image upload.
- The API now uses JSON Web Token 9.0.3 with HS256-only application token verification; the upgrade is verified locally and in production, including a manual login.
- The API now uses Express 5.2.1; the upgrade is verified locally and in production, including health, login, and missing-route checks.
- The API now uses Nodemailer 9.1.0 with hardened SMTP transport; the upgrade is verified locally and through an application email submission against the deployed backend.
- The LangChain/OpenAI integration upgrade and GPT-5.6 Luna default are deployed and verified through an authenticated Agent Chat request against production.
- Render has `OPENAI_MODEL=gpt-5.6-luna` and `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`; the former misnamed `EMBEDDING_MODEL` key has been removed.
- The Agent Chat smoke request completed and returned a coherent answer from the user's memories. Follow-up client QA is deferred to Stage 5 by user decision because the component removes inline citation markers and does not render the returned citation metadata; the same page also displayed a zero-memory list while the agent found five memories.
- The Morgan 1.12.0, node-cron 4.6.0, and Moment 2.30.1 runtime group is implemented and reviewed locally. The daily 08:00 Europe/London schedule, lifecycle handling, and Express request logging are covered by focused offline tests; commit approval and manual deployment remain pending.
- The current local production-install audit reports zero known vulnerabilities after refreshing MongoDB's compatible optional Socks dependency to 2.8.9.
- Atlas backup and access hardening remain deliberately deferred for their own controlled phase.
- The client is still React 18 on Create React App 5; no client modernization has started.

### Next recommended action

Review and, after explicit approval, commit the logging/scheduling dependency group. Manually deploy it on Render and verify container startup, `/health`, and the `Reminder email cron is enabled` startup log without manually triggering reminder emails.

## Stage 1 — Local Docker parity

- [x] Add an API Dockerfile that installs locked production dependencies and runs as a non-root user.
- [x] Exclude local secrets and development artifacts from the Docker build context.
- [x] Add a database-aware `/health` endpoint.
- [x] Add graceful HTTP, cron, and MongoDB shutdown handling.
- [x] Add a disposable MongoDB 8 local Compose environment.
- [x] Add a repeatable health smoke test.
- [ ] Build the image and run the smoke test locally. Render has successfully built and run the same Dockerfile; the local check remains blocked only by the Docker Desktop host fault.
- [x] Review the resulting source changes before production preparation.

## Stage 2 — Production safety and critical security

- [x] Verify Google identity tokens cryptographically using an API-side Google client ID.
- [x] Require authentication and ownership checks for memory-image uploads.
- [x] Derive profile-image ownership solely from the authenticated user.
- [x] Correct authentication middleware error propagation.
- [x] Add a 5 MB image limit, strict JPEG/PNG checks, and reliable temporary-file cleanup.
- [x] Add simple rate limits to public authentication and password-reset routes.
- [x] Limit the administrative user endpoint to required user fields and memory ownership references; do not load or return memory content.
- [x] Add focused built-in tests for bearer-token parsing, verified Google payloads, and ownership comparison.
- [x] Add focused route-level tests for rejected authentication, admin response exposure, rejected upload ownership, and authentication/recovery rate limits.

## Stage 3 — Backup and Render Docker conversion

- [ ] Create a timestamped `mongodump` archive from Atlas without changing database data.
- [ ] Verify the dump completed successfully and store it outside the repositories.
- [x] Record current Render settings and preserve all environment values.
- [x] Switch the existing Render service to its Docker runtime.
- [x] Configure `/health` as the Render health-check path.
- [x] Run production smoke checks and review Render logs.

## Stage 4 — API dependency modernization

- [x] Upgrade Mongoose 6 to Mongoose 8 and resolve deprecated connection and middleware behavior.
- [x] Upgrade Cloudinary and Multer in an isolated upload-focused change set to remove the legacy `vm2` path and Multer 1.x warnings.
- [x] Upgrade JSON Web Token 8 to 9 and pin application token verification to HS256.
- [x] Upgrade Express in its own controlled change set.
- [x] Upgrade Nodemailer and harden the SMTP transport.
- [x] Upgrade LangChain/OpenAI and move Agent Chat to the cost-sensitive GPT-5.6 Luna model; deployed at `1cdb0be` and verified with an authenticated production request.
- [ ] Upgrade the remaining API dependencies in controlled groups. Morgan 1.12.0, node-cron 4.6.0, Moment 2.30.1, and the compatible Socks 2.8.9 lock refresh are complete locally; the remaining direct modernization candidates are bcryptjs, CORS, dotenv, Google Auth Library, and Helmet.
- [x] Re-run the production-only security audit and resolve the currently reported reachable vulnerabilities; the local audit now reports zero findings.
- [ ] Move scheduled jobs out of the web process before adding more API instances.
- [ ] Avoid re-embedding every memory on every Agent Chat request.

## Stage 5 — Client modernization

- [ ] Render Agent Chat citation metadata instead of discarding inline citation markers, and investigate the observed memory-list/count mismatch.
- [ ] Repair or replace the current Jest configuration so tests run reliably.
- [ ] Migrate Create React App 5 to Vite.
- [ ] Upgrade React 18 to React 19 and update incompatible dependencies.
- [ ] Reassess browser token storage and authentication handling.
- [ ] Build and verify the static production client before updating Trilogy hosting.

## Stage 6 — Atlas hardening

- [ ] Create a least-privilege database user for the application.
- [ ] Restrict the Atlas IP access list to the required Render and administrative source ranges.
- [ ] Decide whether to retain manual dumps or upgrade Atlas for managed backups.
- [ ] Do not combine Atlas access changes with the initial Render runtime conversion.
