> **Current iteration:** [FRIENDS_CONTRACT.md](FRIENDS_CONTRACT.md) supersedes the legacy social/post/Hall rules below. The active UI is rooms and friends; posts are owner-only archives.

# Shared implementation contract

Frontend React JSX, lucide-react, no TS. Root owns App.jsx, main.jsx, styles.css, lib.jsx, MediaCall.jsx, onboarding. Agents own assigned files only. Named page exports. Props for all pages: { data, act, refresh, navigate, toast }. `data` is /api/bootstrap output. `act(type, payload={})` posts /api/action with {type,...payload}, refreshes bootstrap, returns response or throws. `navigate(page, id?)` sets page and optional selectedId; page components also receive `selectedId`. All errors handled with toast(err.message). `toast(message)`.

## UI shared exports from src/lib.jsx

`Avatar` from components/Avatar.jsx (props: user or config, size=40, className).
`Button({children, variant='primary'|'secondary'|'ghost', ...props})`.
`Modal({title,children,onClose,wide})`.
`Empty({icon,title,children})`.
`Art({variant='sunset'|'bloom'|'tide'|'orbit',className})` abstract art svg.
`timeAgo(iso)`.
`Badge({children,tone})`.
CSS classes shared: page-heading (h1/p), eyebrow, button, button secondary/ghost, card, section-title, muted, row, stack, field (label+input/select/textarea), pill, avatar, empty-state, grid-2, grid-3, icon-button, tabs (+ active), modal, modal-backdrop, divider. Every button MUST do useful work. Icons lucide. Responsive page styles scoped; agents write `src/pages/<name>.css` import from respective page. No global styles edits.

## Bootstrap data schema

user: {id,handle,name,bio,avatar:{skin,hair,hairStyle,outfit,accessory},verified:boolean,role:'user'|'creator'|'admin',verification:'NOT_APPLIED'|'PENDING_REVIEW'|'VERIFIED',presence,settings:{knocks:'everyone'|'followers'|'nobody',discoverable,onlineVisible,contactSync,reducedMotion,highContrast,notifications},createdAt}
users: public profile array (same public fields plus following:boolean,followers:number,blocked:boolean).
room: {id,ownerId,theme:'sage'|'clay'|'midnight'|'lavender',version,objects:[{id,type,x,y,rotation,color}],history:boolean} owner room.
resources: [{id,type:'tasks'|'journal'|'planner'|'memories'|'whiteboard',title,content}] OWN resources only. tasks content [{id,text,done}]; journal [{id,title,text,date}]; planner [{id,title,date}]; memories [{id,title,url}] whiteboard {text}.
posts: [{id,authorId,caption,variant,mediaUrl,mediaType:'postcard'|'photo'|'video',visibility:'public'|'followers'|'close-friends',likes:number,liked,saved,createdAt}]. No comments.
requests: [{id,fromId,toId,type:'knock'|'invite'|'access',reason,status,roomId,resourceId,scope,createdAt,expiresAt}] relevant only.
session: null or {id,roomId,hostId,participants:[{userId,permissions:{chat,voice,screen,interact,invite},joinedAt}],room:PUBLIC room,grants:[{resourceId,userId,scope}],startedAt}. Only ACTIVE admitted. active host can have zero guests. `myVisits`: accepted request records for voluntary join.
halls: [{id,ownerId,title,description,theme,cover:'sunset'|'bloom'|'tide'|'orbit',published,access:'public'|'followers'|'ticket',live,spotlightId,attendance:number,visitors:number,artworks:[{id,title,description,medium,year,variant,url,alt,price,purchaseUrl,saves,saved}],events:[{id,title,date,rsvps,rsvp}]}]. Non-published visible only owner/admin. demo artwork creators verified by seed.
notifications: [{id,title,text,read,createdAt}], blocks: user ids, reports own or all(admin), verificationRequests admin only, roomieLog owner only.

## Backend endpoints

GET /api/bootstrap authorized; GET /api/health public.
POST /api/auth/register {handle,name,email,password,age,consent}; POST /api/auth/login {email,password}; POST /api/auth/demo {handle:'mika'|'kira'|'noah'|'admin'} enables seeded demo account if ALLOW_DEMO not false; POST /api/auth/logout. HttpOnly cookie. GET /api/public/halls public previews.
POST /api/action (authenticated) response JSON. Actions:
profile.update {name,bio,avatar,presence}; settings.update {settings}; follow.toggle {userId}; block.toggle {userId}; notifications.read;
room.update {version,theme?,objects?}; room.undo; roomie.preview {prompt} -> {proposal:{theme?,objects?,message,action?,tasks?}}; roomie.apply {proposal,version};
resource.save {resourceId,content}; resource.request {resourceId,scope}; GET /api/resources/:id -> permission checked; resource.grant {requestId,scope:'once'|'read'|'write'|'deny'}; resource.revoke {resourceId,userId}; resource.close {resourceId};
post.create {caption,variant,mediaUrl?,mediaType,visibility}; post.like {postId}; post.save {postId}; post.delete {postId}; post.hide {postId};
knock.create {userId,reason:'Hang out?'|'Can we talk?'|'Create together?'}; invite.create {userId}; request.respond {requestId,accept,permissions}; request.cancel {requestId}; session.join {requestId}; session.start; session.leave; session.end; session.remove {userId}; session.permissions {userId,permissions};
hall.save {hall:{id?,title,description,cover,access,theme,artworks}}; hall.publish {hallId,published}; hall.enter {hallId}; hall.leave {hallId}; artwork.save {hallId,artworkId}; event.create {hallId,title,date}; event.rsvp {hallId,eventId}; hall.live {hallId,live}; hall.spotlight {hallId,artworkId}; hall.question {hallId,text}; hall.moderate {questionId,approved};
verification.apply {name,website,statement}; verification.review {userId,approved}; report.create {targetType,targetId,reason,details}; report.resolve {reportId}; account.export (returns sanitized owner data); account.delete {password}.
POST /api/upload JSON {dataUrl,kind:'photo'|'video'|'artwork',name} -> {url}, size+MIME limits, served via /media opaque filename.

Socket.io cookie auth on connection. emit `refresh` to relevant users for state changes. `session:join` optional server autojoins admitted room; `chat:send` {text} -> callback {ok,error}, broadcasts `chat:message` {id,userId,text,createdAt} ONLY live participants with chat permission; no durable chat storage/no catchup. `session:ended`/`session:revoked` clear local chat. `signal` {targetUserId,description?,candidate?} checked live session voice/screen rights -> to target {fromUserId,description?,candidate?}. `hall:join` {hallId}, `hall:leave`, `hall:heartbeat`, `hall:spotlight`, `hall:signal` broadcast WebRTC/signals creator to attendees; no audience avatars ever. Emit `resources:revoked` clears guest content. Rate/size limits and host authority enforced on every operation.

## Frontend module ownership

Room.jsx exports RoomPage, ToolsPage, AvatarPage, RoomiePanel; owns components/Avatar.jsx and RoomScene.jsx. Shared Avatar imported lib. RoomPage includes room editor, own private content shortcuts, Roomie preview/apply. No calls.
Social.jsx exports FeedPage, PeoplePage, ProfilePage, VisitsPage, SettingsPage, NotificationsPage, SafetyPage. Visits integrates MediaCall using `import {MediaCall} from '../components/MediaCall.jsx'`, passing data, act, socket (root App also passes socket).
Creators.jsx exports HallsPage, HallPage, CreatorPage, AdminPage. full hall gallery/author designer events moderation.
