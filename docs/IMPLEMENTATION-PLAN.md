# Modernization implementation plan

This checklist keeps infrastructure changes, security fixes, API dependency upgrades, and client modernization in separate reviewable stages.

Last updated: 1 September 2026

## Current position

- Production API is running successfully as a Docker service on Render at commit `0fd8079`.
- Render health checks are configured at `/health` and currently pass with MongoDB connected.
- The first critical authentication and upload-security patch is deployed.
- The remaining Stage 2 admin-exposure, rate-limit, and route-test patch is complete and reviewed locally; it is awaiting commit approval and is not deployed.
- The production API now has the Google web client ID required for verified Google sign-in.
- Atlas backup and access hardening remain deliberately deferred for their own controlled phase.
- The client is still React 18 on Create React App 5; no client modernization has started.

### Next recommended action

After explicit approval, commit and deploy the reviewed remaining Stage 2 patch. After its production smoke check, start Stage 4 with an isolated Mongoose 6 to Mongoose 8 upgrade, followed by a separate Cloudinary/Multer upgrade. Do not mix those upgrades with Atlas configuration changes or the client migration.

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

- [ ] Upgrade Mongoose 6 to Mongoose 8 and resolve deprecated connection and middleware behavior.
- [ ] Upgrade Cloudinary and Multer in an isolated upload-focused change set to remove the legacy `vm2` path and Multer 1.x warnings.
- [ ] Upgrade JSON Web Token, Express, and the remaining dependencies in controlled groups.
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
