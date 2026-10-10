# Roomverse

A private room for you and your friends, with an original cozy interface and configurable 2.5D avatars. This iteration focuses on **Room and Friends**. Feed and Creator Halls are removed from the interface; their existing saved data is preserved.

Start with a bed, customize your space with Roomie, and invite friends in. Accepted friendship, permission to knock, room admission, and permission to view personal content are separate server-enforced decisions. Photos, journals, tasks, and plans stay private until the host shares them during an approved visit. Profiles show basic details and mutual friends, without posts.

## Deploy on Render

Use [render.yaml](render.yaml) and [the deployment guide](docs/RENDER.md). The Blueprint configures Node 24, one service, and a persistent disk for accounts and uploads. Enter your OpenAI key securely as `ROOMIE_API_KEY` in Render; the default model is `gpt-4.1-mini`. Keep existing `DB_PATH` and `MEDIA_DIR` paths when updating an existing deployment.

## Local development

Requires **Node.js 24+** for built-in SQLite. Use the existing checkout; do not create a worktree.

```sh
cd /workspace/roomie
npm ci --cache /workspace/.npm-cache
npm run dev
```

The app and API run on port **3000**. Development enables shared demo accounts by default; register individual accounts to test real visits. Use separate browser profiles for separate login cookies. Set `ALLOW_DEMO=false` to disable demo sign-in. Optional `.env` configuration is ignored by Git, and injected variables take precedence.

```sh
npm run build
npm test
# With the local app running:
npm run test:ui
npm run test:load
```

The API suite checks authentication, friendships, directed knock permission, room admission, private sharing, media authorization, revocation, and versioned room changes. The browser suite checks navigation and room/friend flows on desktop and mobile. The load script creates and deletes 50 temporary accounts in five-person rooms. Run these account-creation tests on a test service, never against real users' data.

## Room and friends

Send a friend request and optionally ask for knock access. The recipient can accept the friendship with or without that permission. Only authorized friends can knock, either silently or with a short message. Hosts can invite friends; guests choose to join accepted invitations. Each room supports its host and four guests, with every participant's avatar visible.

Mobile chat opens over the room when another participant joins. Close it to see the host's space, ask to view a private object, or leave. Hosts approve or reject requests, change guest permissions, and remove guests. Private content access ends when permission is revoked or the guest leaves. Room chat is temporary, without a permanent inbox or conversation archive.

Roomie proposes catalog furniture/theme changes for the room owner. Review the preview before applying; saved scene versions prevent overwriting newer changes. `ROOMIE_API_KEY`, `ROOMIE_API_URL`, and `ROOMIE_MODEL` enable the OpenAI adapter. Without a configured key, Roomie uses a local catalog assistant. Private resource contents are excluded from model requests.

## Google signup and calls

Google OAuth is optional. Configure a Google web client, register `https://YOUR_HOST/api/auth/google/callback`, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` securely. Render supplies the public origin; set `PUBLIC_URL` only for a custom origin. Existing password accounts must sign in before linking Google; unauthenticated email matches are never automatically linked. Real Google login requires testing with your configured Google account.

Browser calls use WebRTC with explicit microphone/camera/screen consent. For public-network reliability, configure `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`, then test on separate real devices and networks over HTTPS. API load results do not certify video capacity. See [validation details](docs/VALIDATION.md).

## Storage and operations

Run **one Node process** with persistent storage. Accounts, rooms, friendships, resources, and media survive restarts; active visits, chat, and calls end on restart. Use an HTTPS origin with WebSocket upgrades. Production cookies are secure and HttpOnly. Back up SQLite using its online backup API and include uploaded media; committed WAL data can be missing from a naive database file copy.

The initial 20–50-account pilot uses SQLite and local media. Multi-instance deployment requires shared storage and session coordination. To assign a real operator account after registering it, run `node server/manage.js promote YOUR_HANDLE` in the live service shell.

See [the current feature map](docs/FEATURES.md) and [the current implementation contract](FRIENDS_CONTRACT.md). The uploaded PDF remains a product reference; later user instructions define this smaller iteration.
