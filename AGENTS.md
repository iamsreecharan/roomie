# Development instructions

Use the existing checkout. Each cloud task already runs in an isolated workspace; do not create Git worktrees unless the user asks.

- Node 24+ is required. `npm ci --cache /workspace/.npm-cache` installs the frozen lockfile.
- `npm run dev` starts Express + the Vite middleware on port 3000. `npm run build` creates production assets. `npm test` runs API/socket authorization checks. `npm run test:load` requires a running local server and creates/deletes test accounts.
- Secrets belong in securely injected environment variables or ignored `.env`; never print credentials or put them in setup instructions.
- Preserve the independent boundaries between following, accepted room admission, and private-resource access. Every fetch/write must be authorized on the server.
- No permanent DM inbox, public post comments, or audience avatars in Creator Halls. Do not persist normal visit chat. Explicitly distinguish incident reports from conversation history.
- Roomie previews are server-owned, scoped to the owner, and applied only on confirmation with a current scene version. Keep private resource content out of public scenes, postcards, and guest assistant context.
- The single-process SQLite server supports the pilot; do not claim multi-instance or media capacity based on an API load test.
- `.data/`, media, `node_modules/`, and `dist/` are generated or local state. Never commit account databases or uploaded user content.
