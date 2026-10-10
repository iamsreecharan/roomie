# Current version: rooms and friends

The user's latest instructions replace the original PDF scope for this iteration. **Room and Friends** are the primary screens. Feed, social posting, Creator Halls, creator promotion, and decorative quotations are removed from the active experience. Existing saved data remains intact.

| Feature                  | Behavior                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts                 | Email/password signup and session login; optional real Google OAuth with configured credentials.                                                                                                                            |
| Navigation               | Desktop left sidebar; mobile bottom navigation. Name/username search is available at the top with suggestions. Routes support refresh and browser Back.                                                                     |
| Personal room            | New accounts start with a bed. Existing customized rooms are preserved. A visible Roomie prompt offers previewed changes; manual decor controls and private tools are available by scrolling.                               |
| Avatars                  | Original shaded 2.5D illustrations with appearance, hair, outfit, accessory and expression options; participant avatars appear in shared rooms.                                                                             |
| Friendship               | Send, cancel, accept, reject, or remove a friendship. Basic profiles show mutual friends. Following from older versions never silently becomes friendship.                                                                  |
| Knock permission         | Requesters can ask for knock access; recipients independently decide whether to grant it when accepting. Permission can be changed later. Only authorized friends can knock, with an optional message up to 160 characters. |
| Invites                  | Hosts invite friends with username suggestions. Pending invitations never grant content access. Guests explicitly choose to join an accepted invitation or knock.                                                           |
| Shared room              | One host and up to four guests. Host controls admission and removal. Desktop room/chat sit together; mobile chat covers the room and closes to reveal host controls and private-object requests.                            |
| Photos and private tools | Memories/photos, journal, tasks, calendar and whiteboard are private. Admitted guests request access to a specific object; the host approves or rejects it. Friendship alone gives no content access.                       |
| Revocation               | Removing a guest, leaving, ending a visit, blocking or removing a friendship revokes access. Private media routes enforce the same authorization as resource content.                                                       |
| Legacy posts             | Owner-only archives; profiles and navigation never expose a feed or another user's posts.                                                                                                                                   |
| Chat and calls           | Authenticated ephemeral room chat; optional browser calls with explicit device permissions. No permanent DM inbox or stored normal chat history.                                                                            |
| Roomie                   | Owner-only server proposals with preview, confirmation, version checking and undo. OpenAI integration is optional; local catalog behavior works without a key. Private tool contents are excluded from model prompts.       |
| Accessibility            | Keyboard-operated controls, search suggestions, visible focus, responsive scrolling, reduced motion and high contrast preferences. Rendering failures show recovery controls instead of a blank page.                       |
| Persistence              | SQLite plus uploaded media on Render's persistent disk; existing records remain compatible across this update.                                                                                                              |

## Deployment boundaries

The single-process deployment targets an initial 20–50-account pilot. Each gathering is limited to five people; that does not imply 50 simultaneous video streams. Public-network calls need a reachable TURN service and real-device testing. Local API/socket load checks measure the tested workload only.

Google sign-in and OpenAI provider requests need configured credentials and separate live checks. No credentials are included in Git. Email verification/password reset, push notifications, automated moderation, multi-instance infrastructure, payments, and a full 3D renderer remain future work.

See [VALIDATION.md](VALIDATION.md) for current test evidence and [RENDER.md](RENDER.md) for production settings.
