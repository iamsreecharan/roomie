# Roomverse 2D feature map

The uploaded **Roomverse Complete Product Blueprint and UI Prototypes** is the product reference. This version translates its private-room, social and creator workflows into a responsive 2D web app. The blueprint's illustrative counts, purchases and conversations are not actual user activity. Seeded demo profiles and exhibitions are clearly demonstration content.

The three permission boundaries are independent: **follow → approved visit → explicit private-resource grant**. Creator Hall attendance exposes counts and does not render audience avatars.

## Implemented product workflows

| Blueprint area | This version |
| --- | --- |
| Accounts and onboarding | Email/password registration, unique handles, consent and age validation, session-cookie login/logout; each account receives its own avatar, room and private tools. |
| Google sign-in | OAuth integration is available when server-side Google credentials and the redirect URL are configured. Unconfigured environments must not imply Google authentication succeeded. |
| Avatar studio | Original configurable SVG avatars with appearance, hair, skin, outfits and accessories; lightweight rendering across room, profile and visits. |
| Persistent personal room | An interactive SVG room with catalog decor and private-tool props, four themes, pointer/keyboard object placement, color/rotation and saved positions; explicit versioned edits and undo. |
| Roomie scene assistant | Structured catalog proposals, preview before apply, scene undo and an owner-only activity log. The default assistant works locally; an optional provider adapter is available for configured model credentials and still uses owner/version-checked proposals. |
| Private personal tools | Tasks, journal, calendar/planner, uploaded or linked memories and a text whiteboard, with create/edit/delete controls. Tool content belongs to its owner and is withheld from public profiles and visiting room visuals. The whiteboard is text-based; freehand drawing is not implemented. |
| Feed | Discover/Following/Saved views, postcards, photos, videos and captions; likes, bookmarks, hide, reporting and author deletion; no public comments or unsolicited DM inbox. |
| Post visibility | Explicit public, followers or close-friends visibility, enforced by the server. Room postcards show decorative illustrations without embedding tool contents. |
| Social graph | Instant one-way follow/unfollow, searchable profiles, public creator profiles and independent knock controls. Following grants no room or private-content access. |
| Knock/invite handshake | Preset knocks, outgoing invitations, recipient acceptance/decline, cancellation and explicit voluntary join. Pending or declined requests cannot enter a session. |
| Host admission controls | Host selects per-guest chat, voice, screen-share, interaction and invitation privileges; host can change rights, remove a guest or end the visit. |
| Group visits | Several admitted guests share one host session; individual permissions and resource grants remain separate. |
| Ephemeral conversation | Authenticated live Socket.IO chat, participant-only delivery, no catchup for late arrivals and no durable ordinary conversation archive; leave/removal/end terminate access. |
| Calls and screen share | Browser WebRTC voice/video with microphone/camera controls, explicit device consent, desktop video screen share, remote playback and cleanup on leave/revocation. Private calls use a six-peer mesh limit. Two-party local audio/video transfer and revocation cleanup were browser-validated with fake devices and a local TURN TCP relay; internet connectivity and group media capacity need further validation. System audio is not captured. |
| Private object access | Guest requests, owner deny/read-once/read/write grants, permission-checked reads/writes, immediate revoke and automatic expiration when leaving or the session ends. |
| Notifications and presence | Follow, knock, invitation and permission notifications; available/busy/invisible presence, read notifications and independent privacy preferences. |
| Friend discovery | Username search, profiles and shareable links; opt-in email contact matching requires consent from both accounts and respects discoverability/blocks. Input addresses are processed for matching and are not returned in public profiles or retained as a contact list. Device address-book and external social-graph imports are separate integrations. |
| Public Creator Halls | Searchable published galleries and anonymous previews, artwork zoom, alt text, bookmarks and creator-approved browser text-to-speech descriptions, public/follower or creator-issued guest-list access and aggregate current/total attendance; offline galleries remain browsable. Guest-list admission is not a paid ticket purchase. |
| Hall designer | Draft editing, cover/theme/artwork metadata, reordered 2D layouts, frame/light settings, safe built-in catalog design proposals with preview/apply and verified creator publishing; ownership checks prevent editing or publishing another creator's hall. |
| Events and engagement | Creator event scheduling, attendee RSVPs, artwork-save statistics and aggregate creator dashboard analytics. |
| Live Hall mode | Creator-controlled one-way voice/camera/screen-share broadcast, voluntary spotlight selection and moderated questions with creator answers and approval/decline. Hall interfaces expose the creator, never visitor avatars; audience devices are not requested. The current broadcast sends a separate peer connection to each viewer and is a pilot implementation. |
| Creator verification | Application/review flow, admin approval/decline and verified publishing controls. Demo creators are visibly sample accounts. |
| Safety | Blocking, reports, host removal, independent knock privacy, admin report review and creator question moderation. |
| Account controls | Owner data export without credentials or conversation history, password-confirmed deletion and session invalidation. |
| Accessibility | Responsive navigation, 2D access to private tools, keyboard-operable forms/buttons, reduced-motion and high-contrast preferences. |
| Media handling | Authenticated upload, permitted MIME types and file signatures, size limits, opaque filenames and `nosniff` media responses; active SVG/HTML content is rejected. |

## External services and additional engineering

These requirements are distinct from the local product workflows above. They must not be presented as finished services merely because a setting or UI exists.

| Requirement | What remains |
| --- | --- |
| Google OAuth in a deployed environment | Supply Google client ID/secret securely, allow the Google OAuth destinations and register the exact public callback URL; use HTTPS and verify login with an authorized Google account. |
| Generative Roomie and Hall AI | Configure `ROOMIE_API_KEY`, `ROOMIE_API_URL` and `ROOMIE_MODEL` for the optional Roomie provider adapter. Model requests contain the typed prompt and the owner's room visuals; private tool contents are not sent. The default Roomie and Hall design helper use rules/catalog templates. External calendar writes, note summarization and multilingual generative guides are not enabled. |
| Contacts and connected-account suggestions | Reciprocal opt-in email matching is implemented. Device address-book import, hashed contact matching and connected-account suggestions need supported APIs and secure provider/device integration; Instagram social-graph import is not promised. |
| Internet voice/video reliability | Configure and test a publicly reachable TURN service. Test browser microphone/camera/screen permissions, network changes and multi-party sessions using real devices. A local test TURN TCP relay validated two-party fake-device audio/video and cleanup while preserving the managed browser's UDP policy; this does not validate public internet/NAT connectivity. Local API/Socket.IO load checks do not establish audio/video capacity. |
| Large creator broadcasts | Managed SFU/streaming/CDN integration and broadcast load validation are required for reliable audiences at scale. Basic WebRTC signalling is not equivalent to a production streaming service. |
| Ticketed admission and commerce | The blueprint places payments in an optional later phase. Payment checkout, ticket entitlements, refunds, inventory, subscriptions and cosmetics billing are not implemented. No UI may imply money was taken or a ticket exists. |
| Artwork audio guides and translations | Creator-approved descriptions and creator-written Spanish/French/Hindi translations can be read through browser text-to-speech. Prerecorded audio guides, captioning and automatic translation need content and further implementation/integration. No generated translation is claimed. |
| Advanced account management | Email verification, password reset/passkeys, Apple sign-in, username changes and regional consent/child-protection policy need further implementation. This build is for adults; it does not implement a jurisdiction-specific under-18 flow. |
| Production content moderation | Automated media review, copyright takedown procedures, creator teams, appeals/suspension and audited evidence-retention operations need operational integrations and policies. The current reports/review UI is the initial workflow. |
| Production storage and scaling | This version uses SQLite and local media for one application instance. Managed private blob storage/CDN, backups, encryption at rest, PostgreSQL/Redis and multi-instance coordination need deployment-specific implementation. |
| Notification delivery | In-app notifications work. Push/email delivery, scheduled reminders and quiet hours require provider and worker integration. |
| Offline operation and full accessibility certification | Offline encrypted drafts, complete screen-reader review, live captions and formal device/network/accessibility testing remain separate work. |
| Growth analytics | Local creator aggregates work. D1/D7/D30 retention, experiment assignment and production analytics reporting need an analytics service and explicit privacy choices. |

## Later 3D version

The saved room object IDs, transforms, themes and resource ACLs form the data boundary for a later Three.js/WebGL renderer. Replace the 2D presentation while keeping authorization on the server. Future work includes 3D assets/rigging, WASD/touch movement, collisions and spawn protection, lighting, lower-detail rendering, 3D Hall layout and approved asset ingestion. This 2D version bounds object positions; it does not have a physical collision engine. A 3D client must continue to receive only redacted resource metadata. The audience must remain invisible as avatars in Creator Halls.

## Verification and capacity scope

- `npm test` runs isolated API/Socket.IO integration tests for authentication, server-side redaction, voluntary admission, per-resource grants, revocation/leave, host privileges, blocking, ephemeral chat, versioned room edits, creator ownership/publication, Hall attendance and upload validation.
- `npm run test:load` creates **50 independent test accounts and 50 authenticated sockets** by default, enters one public Hall, exercises concurrent bootstrap/update requests, checks identity/count/notification delivery, reports p50/p95/max latency and errors, then deletes the temporary accounts.
- `node tests/media.e2e.js` uses two isolated Chromium contexts and fake microphone/camera devices to exercise actual local WebRTC media transfer and permission/end cleanup. It requires Chromium (default `/usr/bin/chromium`; override with `CHROMIUM_PATH`) and a running app. `TEST_ICE_SERVERS` can supply a JSON ICE-server array for a test relay. It is separate from the API test suite and from the 50-user capacity check. Managed browsers that disallow direct UDP require a TURN relay; the test preserves that policy.
- To test 20 users, use `LOAD_USERS=20 npm run test:load`. `BASE_URL`, `LOAD_ROUNDS` and `LOAD_P95_MS` configure the target, request rounds and acceptable local p95 latency.
- This measures local API, realtime notifications and aggregate Hall attendance. It does **not** certify 50 simultaneous media streams, public internet capacity, production security or durability under host failure.

An initial local run passed 20 API/Socket.IO integration tests and the 50-user load check: 651 measured requests, zero request errors, p50 100 ms, p95 188 ms and maximum 268 ms. All 50 sockets stayed connected, Hall attendance increased by 50 and all temporary accounts were deleted. Focused browser validation also exercised verified publishing, gallery inspection/bookmarks, creator-written translations, question answers/approval/decline, event RSVP, guest-list admission and emergency live-stop controls. Two isolated Chromium contexts transferred real audio/video RTP in both directions over a local TURN TCP relay using fake devices; permission revocation stopped guest capture and closed peer connections, and session end stopped host capture. These figures describe this development machine and run, not a service-level guarantee.

See the README for installation, startup and deployment configuration. Never copy OAuth secrets or session credentials into this document.
