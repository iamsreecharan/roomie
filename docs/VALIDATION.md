# Validation record

Validated in the cloud development machine on October 9, 2026. These results concern this version and the tested workloads; the Render service has not been created or tested on a public origin.

- Frozen installation script (`npm ci`, unchanged lockfile) and production build passed.
- All **20** API/Socket.IO integration tests passed, including identity, finite-age consent, independent follow/admission/resource grants, blocks, revocation, private media, ephemeral chat, creator permissions and contact consent.
- A 50-user load run created **50 independent accounts and 50 authenticated sockets**, added 50 attendees to a shared Hall, and completed **651 measured requests with zero errors**. This run measured p50 **123 ms**, p95 **198 ms**, maximum **313 ms**. Temporary accounts were deleted.
- Real browser checks covered private-tool CRUD and uploads, avatar persistence, room keyboard editing and undo, Roomie preview/apply and tool navigation, posts and visibility, contact matching, accepted visits, per-resource collaboration/revocation, creator publishing, translations/audio approval, RSVP, question moderation, voluntary spotlight, and stopping a live event.
- Desktop and **390 px** mobile browser checks had no JavaScript errors or horizontal overflow in the tested pages.
- Private-call tests used two isolated Chromium contexts with fake camera/microphone devices and a **local authenticated TURN TCP relay**. Actual audio/video RTP flowed in both directions and remote video decoded; revoking guest media rights and ending the session stopped capture and closed peer connections.
- Creator broadcast tests delivered actual audio/video RTP and decoded 480×270 video. The viewer captured no camera/microphone and sent no media tracks. Ending the broadcast closed the viewer connection and stopped creator capture.
- The relay respected the machine’s managed browser policy; that policy was not changed. Local relay/fake-device tests do not establish internet NAT reliability, screen-share usability on real devices, or 50-stream media capacity.
- Production startup checks confirmed compiled assets, disabled demo access, Secure/HttpOnly/SameSite session cookies, origin checks with Render’s external URL, health checks, and database/upload paths suitable for a persistent Render disk.

Google OAuth and the OpenAI provider are implemented but were **not tested against live accounts/keys**, because their credentials were not available. Public Render deployment, public-network calls, payment checkout, push delivery, and large broadcasts require their own configured services and validation. See [FEATURES.md](FEATURES.md) and [RENDER.md](RENDER.md).
