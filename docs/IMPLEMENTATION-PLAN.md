# Modernization implementation plan

This checklist keeps infrastructure changes, security fixes, API dependency upgrades, and client modernization in separate reviewable stages.

## Stage 1 — Local Docker parity

- [x] Add an API Dockerfile that installs locked production dependencies and runs as a non-root user.
- [x] Exclude local secrets and development artifacts from the Docker build context.
- [x] Add a database-aware `/health` endpoint.
- [x] Add graceful HTTP, cron, and MongoDB shutdown handling.
- [x] Add a disposable MongoDB 8 local Compose environment.
- [x] Add a repeatable health smoke test.
- [ ] Build the image and run the smoke test locally.
- [x] Review the resulting source changes before production preparation.

## Stage 2 — Production safety and critical security

- [ ] Verify Google identity tokens cryptographically using an API-side Google client ID.
- [ ] Require authentication and ownership checks for memory-image uploads.
- [ ] Derive profile-image ownership solely from the authenticated user.
- [ ] Correct authentication middleware error propagation.
- [ ] Add rate limits, request-size limits, and reliable temporary-file cleanup.
- [ ] Review the administrative decrypted-memory endpoint and reduce its exposure.
- [ ] Add focused automated tests for authentication, authorization, health, and upload ownership.

## Stage 3 — Backup and Render Docker conversion

- [ ] Create a timestamped `mongodump` archive from Atlas without changing database data.
- [ ] Verify the dump completed successfully and store it outside the repositories.
- [ ] Record current Render settings and preserve all environment values.
- [ ] Switch the existing Render service to its Docker runtime.
- [ ] Configure `/health` as the Render health-check path.
- [ ] Run production smoke checks and review Render logs.

## Stage 4 — API modernization

- [ ] Upgrade Mongoose 6 to Mongoose 8 and resolve deprecated connection/middleware behavior.
- [ ] Upgrade Express and the remaining dependencies in controlled groups.
- [ ] Re-run security audits and resolve remaining reachable vulnerabilities.
- [ ] Move scheduled jobs out of the web process before adding more API instances.
- [ ] Avoid re-embedding every memory on every Agent Chat request.

## Stage 5 — Client modernization

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
