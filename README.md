# DCS Research API

Express API for the DCS Research Repository System. The API uses MySQL for research records, users, sessions, and audit logs. PDF uploads are stored on disk.

## Run locally

Requirements: Node.js 20+ and MySQL 8 (or compatible).

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Set `DB_PASSWORD` in `.env`. Create the `dcs_research` database, then apply the SQL migrations in `migrations/` in numeric order. Start the API on port 5000 by default (`PORT` can override it). Create the first administrator with:

```powershell
npm run bootstrap-admin -- admin@example.edu
```

The command asks for a password interactively and does not echo it. Run it from a terminal.

## Deploy API and database to Railway

1. Create a Railway project and add a **MySQL** service. Railway can have a $0 Free plan with a small monthly usage credit and sleeping services, or a paid Hobby plan that starts at $5/month. The API and database use resources separately, so check Railway's current limits and dashboard estimate for your expected usage.
2. Deploy this repository as a separate service. If Railway asks for a root directory, use `.` when this API repo is connected directly, or `dcs-rt-api` when deploying from a parent repository.
3. Railway detects `package-lock.json` and installs dependencies during deployment. The included `railway.json` sets `npm start` and the `/health` deployment check.
4. In the API service's Variables, reference the MySQL service's `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE` variables. The API reads these names directly. Keep the database private; the API and database should be in the same Railway project/environment.
5. Generate a public Railway domain for the API service. The API listens on Railway's injected `PORT`.
6. Set `CLIENT_ORIGINS` to the exact deployed frontend origin, such as `https://your-site.vercel.app` or `https://your-site.netlify.app`. Separate multiple origins with commas and do not add a trailing slash. Keep `NODE_ENV=production`.
7. Confirm the service health check path is `/health`. This endpoint returns `200` only while MySQL is responding; `railway.json` configures it automatically.
8. Create the initial `research` table in the Railway-provisioned database. This base schema omits `description` and `academic_year`; migrations 001 and 004 add those columns:

   ```sql
   CREATE TABLE research (
     id INT AUTO_INCREMENT PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     type ENUM('Capstone', 'Thesis') NOT NULL DEFAULT 'Capstone',
     authors TEXT NOT NULL,
     abstract TEXT NOT NULL,
     pdf_url VARCHAR(500),
     adviser VARCHAR(255) NOT NULL,
     critic VARCHAR(255) NOT NULL,
     status ENUM('MOR', 'Part A', 'Part B', 'Finished') NOT NULL DEFAULT 'MOR',
     website_url VARCHAR(500),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

   Railway's `MYSQLDATABASE` is provided for you, so use the database already provisioned rather than assuming it is named `dcs_research`.
9. Apply all SQL files in `migrations/` to the Railway database in numeric order. You can use `railway connect <mysql-service-name>` (requires the local MySQL client) and paste each SQL file into the session, or connect a GUI client through `railway connect <mysql-service-name> --tunnel-only`. Do not run a migration a second time if its columns/tables already exist; the SQL files are not an automatic migration runner.
10. Create the first admin after migrations. Use `railway ssh --service <api-service-name> -- npm run bootstrap-admin -- admin@example.edu` from a terminal. This runs inside the deployed API container and can reach Railway's private database. The command prompts for the password; do not place it in a command argument or environment variable.

### Persist uploaded PDFs

Railway's container filesystem is ephemeral. Attach a Railway Volume to the API service, set its mount path to `/app/uploads`, and set the API variable `UPLOADS_DIR=/app/uploads`. The app will create the directory if needed when handling uploads. Existing local `uploads/` files are not copied automatically; migrate any files you need to retain before switching.

Set regular database backups in Railway and keep a separate backup of uploaded PDFs. A database backup does not include files on the API volume. Railway Free includes only 0.5 GB of volume storage; check your plan's current limits before uploading many manuscripts.

## Configuration

Railway's health check endpoint is `/health`; it responds with `503` if MySQL is unavailable.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; Railway provides this automatically. |
| `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` | Railway MySQL connection values. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Local/alternate MySQL connection values. |
| `CLIENT_ORIGINS` | Exact allowed frontend origins, comma-separated. |
| `UPLOADS_DIR` | Optional absolute directory for uploaded PDFs. |
| `NODE_ENV` | Set to `production` when deployed; used for secure session cookies. |

Never commit `.env` or database credentials. The API's `.gitignore` excludes `.env`, dependencies, logs, and local uploads.
