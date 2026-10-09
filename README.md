# Roomverse

An original, cozy **2D** social home built from the Roomverse product blueprint. Your room and private tools persist; your conversations happen only during approved visits. Following someone, entering their room, and reading a private object are three separate permissions.

The interface is an original design, rather than a reproduction of the PDF prototypes. SVG avatars are editable, lightweight, and unique to their appearance configuration. Room objects have persistent IDs, coordinates, and resource boundaries for a later 3D renderer.

## Deploy on Render

Use [the Render Blueprint](render.yaml) and [the deployment guide](docs/RENDER.md). It configures Node 24, one service, persistent account/upload storage, and OpenAI Roomie. Enter your OpenAI key securely as `ROOMIE_API_KEY` in Render; the default model is `gpt-4.1-mini`. Render service creation requires your account and review of the paid persistent-disk plan.

## Run locally

Requires **Node.js 24+** (uses built-in SQLite).

```sh
cd /workspace/roomie
npm ci --cache /workspace/.npm-cache
npm run dev
```

The app and its API run on port **3000**. Development defaults to seeded demo accounts for exploring personal and creator workflows. Each demo is a shared account: never put private data into it. Register separate accounts to try real two-person visits. Separate browser profiles/private windows provide separate login cookies.

```sh
cp .env.example .env
# Edit .env securely. ALLOW_DEMO=false disables demo sign-in.
npm run dev
```

Environment variables are loaded from `.env` if present; shell-injected variables take precedence. Do not commit `.env`. The pilot supports accounts aged **18+** pending regional child-protection work.

## Production pilot

```sh
npm ci --cache /workspace/.npm-cache
npm run build
NODE_ENV=production PUBLIC_URL=https://your-domain.example ALLOW_DEMO=false npm start
```

Run **one Node process** with persistent storage for `.data/` (SQLite and uploaded media). Use an HTTPS reverse proxy, forward WebSocket upgrades, and configure the exact public origin. Production sessions use secure HttpOnly cookies. Back up the database and media together. Session conversations and live presence are memory-only and end on restart.

SQLite is appropriate for this single-server 20–50-user pilot. A public multi-instance rollout needs shared storage, PostgreSQL/Redis, monitored backups, abuse operations, final privacy/legal policy, and independent security review. Capacity results below cover the tested local workload; they are not a guarantee for every deployment or media workload.

Create a real user before assigning an operator/admin role:

```sh
node server/manage.js promote YOUR_HANDLE
```

This operator-only local command enables the review desk for creator-verification requests and reports. Ordinary signup cannot grant administrator or creator publishing rights.

## Google signup

“Continue with Google” uses a real OAuth authorization-code flow with a state cookie. It never fakes a successful Google login when configuration is missing.

1. Create a Google Cloud OAuth web client and configure its consent screen/test users.
2. Register `https://YOUR_HOST/api/auth/google/callback` as the authorized redirect URI. For local development use `http://localhost:3000/api/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_URL` securely, then restart the server.
4. Allow outbound HTTPS to `oauth2.googleapis.com` and `openidconnect.googleapis.com`; browser users must be able to open `accounts.google.com`.

Google-created accounts must complete age and consent before accessing app actions. To link an existing email/password account, first sign in with its password, then use Connect Google from your profile. The server binds the linking flow to that signed-in account and requires Google to return the same verified email. Unauthenticated email matches are never silently linked. OAuth credentials are not available in this workspace, so a real Google account login cannot be validated here.

## Roomie

The default Roomie is an honest **local catalog assistant**: request furniture/theme changes or a task, review a proposal, then apply it. Scene changes support undo. Private notes are not included in a guest-visible assistant prompt.

An optional OpenAI-compatible provider can be configured using `ROOMIE_API_KEY`, `ROOMIE_API_URL`, and `ROOMIE_MODEL`. Keep the key secret. Proposals still go through the server-owned catalog and confirmation boundary. Check `/api/config` for the active mode. External calendar writes, autonomous invitations, purchases, and public posting are intentionally not executed by Roomie.

## Visits and media

Knock with a preset reason or send an invitation. The recipient must accept and the guest must choose to join. The host controls chat, microphone, screen sharing, activity, invitation privileges, and private-resource grants individually. Guest scene responses include locked metadata rather than journal/task/planner payloads. Removing a guest, ending a session, blocking, or revoking a grant stops further server access.

Text chat uses authenticated Socket.IO, has no catchup for late guests, and is never stored in the ordinary database. Hosts and approved participants can start browser WebRTC calls with explicit microphone/camera/screen consent. Private calls use a small peer mesh capped at **six active media participants**. Larger groups can still use room chat with separately controlled rights.

For reliable public-network calls configure `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`, use HTTPS, and test actual browsers/devices and networks. Temporary TURN credentials are preferable for production. Browser relays are separate from the cloud environment's HTTP egress proxy.

Creator live Halls support creator-only one-way WebRTC pilot broadcasts, voluntary artwork spotlight, and moderated questions. The audience appears only as a count. A creator streaming to many individual peers is limited by their upload bandwidth; reliable 20–50-viewer media needs a managed SFU/broadcast/CDN service and a separate media load test. API/socket load tests do not certify call or video quality.

## Validation

```sh
npm test
# Start the app in another terminal first:
npm run test:load
LOAD_USERS=20 npm run test:load
```

The integration suite exercises auth, consent, admission, per-resource privacy, revocation, blocking, chat isolation, hall rules, uploads, and version conflicts. The load script creates and later deletes 50 independent accounts, opens 50 authenticated sockets, exercises concurrent APIs and Hall attendance, and reports errors and latency. Do not run destructive test-account creation against a production service without operator authorization.

See [the feature map](docs/FEATURES.md) for coverage and the explicit limits of external integrations, optional commerce, connected contacts, large media broadcasts, advanced moderation, and the later 3D renderer. Payments are not collected. A contact-consent preference does not import an address book. Artwork speech guides use only creator-approved descriptions and your browser's voice support.
