# Deploy Roomverse on Render

Roomverse runs as one native Node.js 24 web service. [`render.yaml`](../render.yaml) builds the React app and serves the app, API, authenticated Socket.IO connections, and uploads from the same HTTPS origin. The SQLite database and uploads live together on a persistent disk. This is the deployment shape for the initial 20–50-account pilot; local API load results do not guarantee public-network call capacity.

## Deploy the Blueprint

1. Publish this project, including its lockfile and `render.yaml`, to `iamsreecharan/roomie` on GitHub's `main` branch. Do not commit `.env`, `.data/`, uploaded media, or generated build files.
2. In [Render](https://dashboard.render.com/), connect the GitHub account with access to that repository, select **New → Blueprint**, and select `iamsreecharan/roomie`.
3. Enter your OpenAI key in the secure `ROOMIE_API_KEY` field. Review the proposed **Starter web service and 1 GB persistent disk** and Render's current pricing before creating them. Both are paid resources. A free web service cannot attach the persistent disk this SQLite app requires.
4. Deploy and wait for the build and `/api/health` check to succeed. Open the HTTPS URL displayed by Render. Register an individual account; shared demo sign-in is disabled.

The Blueprint sets:

| Setting               | Value                                   |
| --------------------- | --------------------------------------- |
| Runtime               | Node.js 24                              |
| Instances             | 1                                       |
| Build                 | `npm ci --include=dev && npm run build` |
| Start                 | `npm start`                             |
| Health check          | `/api/health`                           |
| Persistent disk mount | `/var/data`, 1 GB initially             |
| Database              | `DB_PATH=/var/data/roomverse.sqlite`    |
| Uploaded media        | `MEDIA_DIR=/var/data/media`             |
| Demo access           | `ALLOW_DEMO=false`                      |

Keep the service at **one instance**. Presence, visit sessions, live chat, and media signaling live in that process, and SQLite lives on that service's disk. Horizontal scaling needs a separate database/shared-session architecture. Increase disk capacity before uploads fill it; Render's disk pricing and resizing limits apply.

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. The server binds to `0.0.0.0` and uses that public URL for origin checks and OAuth callbacks. For a custom domain, set `PUBLIC_URL=https://YOUR_DOMAIN` to the exact canonical HTTPS origin, without a path, and direct users to that origin. Production cookies are secure and Render's reverse proxy supports WebSocket upgrades.

## Enable Google signup

Google signup needs credentials from your own Google Cloud project. It is optional for creating the service; email/password signup works first. Store credentials only in Render's **Environment** tab, never in GitHub or chat.

1. Configure a Google OAuth consent screen and create an **OAuth client ID → Web application**. Add test users while the consent screen remains in testing.
2. Register the exact redirect URI `https://YOUR_RENDER_HOST/api/auth/google/callback`. If using a custom domain, use `https://YOUR_DOMAIN/api/auth/google/callback` instead.
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render and save/redeploy. Set `PUBLIC_URL` only when overriding Render's supplied URL.
4. Open `/api/config` and check that Google is enabled. Test a real Google sign-in and the required age/consent step, then log out and sign in again.

The server calls `oauth2.googleapis.com` and `openidconnect.googleapis.com`; browsers open `accounts.google.com`. A Google testing consent screen limits who can sign in until the project is published. Follow Google Cloud's requirements for the intended audience.

## Calls and the Roomie assistant

For reliable browser calls across public networks, add `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` from your TURN provider, then redeploy. Test microphone, camera, and screen sharing from two separate devices/networks on the public HTTPS URL. Rooms allow a host and four guests. Validate the intended group-call workload separately; 20–50 concurrent accounts do not imply 20–50 simultaneous video streams.

The Blueprint configures **OpenAI** for Roomie. Enter your OpenAI key as `ROOMIE_API_KEY` when Render prompts, or in the service’s **Environment** tab. The default `ROOMIE_MODEL` is `gpt-4.1-mini` and `ROOMIE_API_URL` is `https://api.openai.com/v1/chat/completions`. Keep the key server-side; never put it in a `VITE_` variable, source file, or browser bundle. Without a configured key, Roomie uses its local catalog assistant. OpenAI usage and TURN/media hosting incur separate provider charges. After deployment, check `/api/config` reports `roomieMode: "provider"`, request a room change, review it, and click Apply.

## Operator access, validation, and backups

After registering a real operator account, use Render's service shell:

```sh
node server/manage.js promote YOUR_HANDLE
```

The command uses the service's `DB_PATH`; it should run in the live service shell with its disk mounted. Builds and isolated jobs do not provide the live disk. Do not promote an account you do not control.

Before inviting pilot users:

- Check `/api/health` and create two real accounts in separate browser profiles.
- Send and accept a friend request, decide knock permission separately, and verify unauthorized friends cannot knock.
- Verify a host accepts a permitted knock or invites a friend, the guest explicitly joins, and denied photos/private resources remain locked.
- Verify chat and a real browser call, then remove the guest and confirm access stops.
- Upload a small image and check it survives a service restart along with the account and room.
- If Google is configured, complete a real sign-in on the public origin.

Back up the SQLite database with SQLite's online backup API and copy uploaded media as part of a coordinated backup. Do not copy only the main `.sqlite` file while writes are active: the database uses WAL, and committed changes may be in its sidecar files. Keep encrypted off-service backups and test a restore before relying on the pilot. Disk snapshots alone do not replace tested database/media recovery.

Deploys and restarts end active visits, in-memory chat, and calls; permanent account/room/resource state and uploads persist on `/var/data`. A disk-mounted service can have deployment downtime; schedule updates around active gatherings. Deleting the service/disk or changing either storage path can lose or hide data. Monitor application errors, memory, disk usage, and call quality during the pilot.

## Manual web-service setup

If creating **New → Web Service** instead of a Blueprint, use the table above, add a persistent disk at `/var/data`, and set every listed environment variable. Do not use a Static Site: Roomverse needs its Node API and WebSocket server. Build dependencies must include development dependencies (`npm ci --include=dev`).

Official references: [Blueprint specification](https://render.com/docs/blueprint-spec), [Node versions](https://render.com/docs/node-version), [persistent disks](https://render.com/docs/disks), and [WebSockets](https://render.com/docs/websocket).
