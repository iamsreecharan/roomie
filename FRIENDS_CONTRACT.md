# Current iteration: rooms and friends

The latest user request supersedes follow-based post visibility and unrestricted knocks in CONTRACT.md. Halls and Feed are removed from the active interface, while persisted data remains intact. The user latest steering removes social posts from this iteration: profiles are basic cards, no public or friend feed.

## Friendship and knocks

- Mutual accepted friendship is stored with directed `friend` relations in both directions. Existing follows never silently become friendships.
- `knockAccess` relation is owner -> authorized friend. Friendship alone does not grant knocks. Users see only their own permission relationships.
- `friend.request`: { userId, requestKnockAccess: boolean, grantKnockAccess: boolean }. Request sender explicitly asks for permission to knock at recipient's room, and may separately allow recipient to knock at theirs; both default false.
- `friend.respond`: { requestId, accept: boolean, grantKnockAccess: boolean }. Recipient accepts/rejects friendship and decides permission for sender at recipient's room. The requester permission is granted only if explicitly requested and approved. Requester's offered permission applies only on acceptance.
- `friend.cancel`: { requestId }; `friend.remove`: { userId }; `friend.knock`: { userId, allow: boolean } manages owner's permission for an existing friend.
- Pending friend requests use existing request entities with type `friend`, fromId, toId, status `pending/accepted/declined/cancelled` and timestamps. Opposite duplicate requests produce a clear conflict or expose the incoming request for response.
- Bootstrap `users` each have isFriend, friendshipStatus (`friends/incoming/outgoing/none`), canKnock (they permit current user), canKnockAtMine (current user permits them), mutualCount, mutuals (public basic users), incoming/outgoing requestId when relevant. Existing own public profile fields remain.
- Existing post data is an owner-only archive: bootstrap/post/media reads must never expose another user's posts, including friends. No Feed, post composer, or posts tab in active UI. Host photos and personal content use memories/private resources during admitted room visits, with explicit host resource approval. Friendship and a pending invite alone never grant content access. Existing visibility fields cannot bypass this boundary.
- `knock.create` requires friendship + owner's knockAccess + existing owner knock settings; { hostId, message? } supports empty knock or short message <=160 characters. Existing preset reason may remain optional.
- `invite.create` requires invitee to be host's friend, plus existing inviter host/session permission. No friendship bypass by guests.
- Unfriend/block removes both friendship directions and both knock permissions; cancels relevant pending friend/visit requests and revokes active admissions/private grants between these users. Knock permission revocation prevents future knocks and pending knock acceptance.

## Shared room behavior

Existing session/resource actions keep their shapes. Bootstrap admitted `session` includes hostId and participants with userId; public room contains only permitted metadata, no private resource content. Room renderer joins participant IDs to public users. Host + up to four guests are visibly represented; overflow also remains visible if legacy session exceeds five.

Mobile chat covers room when session has at least two people. Title is `<host name>'s room`. User may close chat to view room, request resource access, leave, or host kick. Opening on join is keyed to session/transition, not every refresh. Desktop has room/chat alongside. Shared chat can be extracted to src/pages/Visits.jsx so Room and Visits use identical permission/error handling.

Starter room is only a bed. Existing owner customization is preserved. Roomie prompt is the primary visible way to change the room; manual controls remain below for convenience. Guest room edits require existing host-approved interaction/resource permission. Roomie cannot act on guests' host room as owner.

## File ownership for parallel work

Backend: server/*.js. Social: src/pages/Social.jsx, social.css. Room: src/pages/Room.jsx, room.css, components/RoomScene.jsx. Visits: src/pages/Visits.jsx, visits.css. Avatar: src/components/Avatar.jsx. Verification: tests/, docs/VALIDATION.md. Root: App.jsx, main.jsx, lib.jsx, styles.css, docs/FEATURES.md, AGENTS.md, contract/docs integration. Coordinate shared interfaces before edits.
