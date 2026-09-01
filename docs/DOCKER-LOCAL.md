# API Docker preparation

This workflow runs the API against a disposable local MongoDB 8 container. It does not use or modify the production Atlas database.

## Start and verify

From the `api` directory:

```powershell
docker compose -f docker-compose.local.yml up --build --detach
npm run smoke
docker compose -f docker-compose.local.yml ps
```

The API is available at `http://127.0.0.1:5000`, and its health endpoint is `GET /health`.

The local workflow deliberately disables reminder-email cron jobs and field-level memory encryption. It contains no production secrets and does not load `config.env` into either container.

## Stop and remove the disposable environment

```powershell
docker compose -f docker-compose.local.yml down --volumes --remove-orphans
```

No MongoDB volume is declared, so container data is disposable. The `--volumes` flag also removes any anonymous volumes created by the MongoDB image.

## Render deployment settings (later phase)

Do not deploy until the local container has passed its smoke test and a production `mongodump` archive has been created and verified.

When the production phase is approved:

- Use the repository `Dockerfile` as the Render runtime.
- Keep Atlas external and retain the existing protected `MONGODB_URI` environment variable.
- Configure Render's health-check path as `/health`.
- Keep a single API instance while the in-process reminder cron remains enabled.
- Set `ENABLE_REMINDER_CRON=true` explicitly in production to make the existing behavior visible.
- Preserve all existing secret values; do not bake them into the image.
- Deploy and validate authentication, memory CRUD, uploads, email, and Agent Memories Chat before considering dependency upgrades.
