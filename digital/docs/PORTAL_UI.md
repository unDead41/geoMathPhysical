# Account and classroom UI integration

The extension consists of `dist/portal.mjs`, `dist/portal.css`, and `dist/theme.mjs`. It uses the existing SVG geometry, icons, typography, radii, button classes, and semantic variables from `art.mjs` and `style.css`. Product copy is BM and uses the class/room terms shown in the actual workflow. There are no seeded people, classes, rooms, scores, or fabricated completions.

## HTML and application wiring

Load `portal.css` **after** `style.css`. Add two real header buttons and one empty section inside the existing main element:

```html
<button type="button" class="nav-button" id="account-button">
  <span data-icon="user"></span><span>Akaun &amp; kelas</span>
</button>
<button type="button" class="nav-button" id="theme-button"
  aria-label="Tukar kepada tema gelap" aria-pressed="false"></button>

<section id="portal-screen" hidden></section>
```

The root application owns screen switching, the account-button listener, and any existing active-game leave/pause policy. `portal.open()` unhides its own section; it does not hide the welcome, game, or results sections. `portal.close()` hides and clears its own content and removes room/poll/session subscriptions. It does not call `onExit` itself. The visible portal back button calls `close()` and then `onExit()`; while the one-time recovery code is displayed, it first asks the user to save and acknowledge that code.

```js
import {createPortal} from './portal.mjs';
import {initTheme} from './theme.mjs';

initTheme();
const portal = createPortal({
  cloud,
  onPlay(state) {
    // Portal streams are already closed. Restore/run the original game here.
    cloud.setRoom?.(state.roomId);
    openOriginalGame(state);
  },
  onExit() { showWelcome(); },
  onError(error) { /* Optional host diagnostics; portal already shows BM feedback. */ }
});

document.getElementById('account-button').addEventListener('click', async () => {
  hideOtherScreens();
  await portal.open();
});
```

The public object exposes `open({roomId?})`, `close()`, `refresh({silent?})`, `showRoom(roomId)`, `destroy()`, and the getter `isOpen`. Event listeners are delegated once per instance and removed by `destroy()`. Call `close()` whenever another root navigation route leaves the portal. `onPlay` receives either the authoritative `start_attempt` state or the finished `room.my_attempt` state; the latter must display existing results without creating a new attempt or saving duplicate results.

For a preference-correct first paint, place this small bootstrap before the stylesheets. The module then owns the preference and header button:

```html
<script>
try {
  const preference = localStorage.getItem('geodecoder.theme.v1');
  document.documentElement.dataset.theme =
    preference === 'dark' || preference === 'light'
      ? preference
      : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
} catch {}
</script>
```

`theme.mjs` also applies on import, so call `initTheme()` again after the header exists if importing it from the head. Repeated initialization does not duplicate listeners. `setTheme('light' | 'dark' | 'system')` changes the preference; system mode removes the stored override. Storage access is guarded. With no saved preference, system changes apply automatically. The button announces its target theme in BM and exposes the current dark state through `aria-pressed`.

## Cloud assumptions

| Member | Required behavior |
|---|---|
| `ready` | `false` means online accounts have not been configured; the local game remains available through the root. |
| `session` | Current session or `null`; the session changes before a successful `auth()` call resolves. A Supabase `session.user.id` identifies the account. |
| `init?()` | Optional asynchronous session initialization, called on opening when `ready !== false`. |
| `auth(action, payload)` | Supports `signup`, `login`, `recover`, and `logout`; throws a readable BM `Error` on failure. |
| `rpc(action, payload)` | Calls the authorized `geo_action` endpoint and returns JSON; it throws for the endpoint's `{error: {code, message}}` result. |
| `watch(roomId, onChange, onStatus)` | Returns cleanup. Only a **teacher viewing a room** calls it. `SUBSCRIBED` is the only status labelled “Masa nyata”. |
| `onSessionChange(callback)` | Returns cleanup. Account changes clear rendered data, room watches, timers, input drafts, and the one-time recovery value. |
| `setRoom?(roomId)` | Optional heartbeat-room hook. Called on opening/changing a room and with `null` on leaving/signing out. Root game setup sets the active attempt room after the portal has closed. |

Authentication payloads:

- `signup`: `{username, display_name, password, role: 'teacher' | 'student'}`.
- `login`: `{username, password}`.
- `recover`: `{username, password, recovery_code}`.
- `logout`: `{}`.

Username validation is exact lowercase `^[a-z0-9_]{3,24}$`; display names contain 2–60 characters; new passwords contain 10–128 characters. Existing login passwords are only required, so a future password-policy change does not block an existing account. Recovery accepts the server's 32 hexadecimal characters. Passwords are never trimmed, logged, put into URLs, or stored by the portal. Recovery entry is masked with a reveal control. The signup/recovery response may include `recovery_code`; this value is shown once with a copy control until “Saya sudah simpan, teruskan” is activated. Session events for that same account do not dismiss it.

The snapshot contract is:

```js
{
  profile: {id, username, display_name, role, last_seen},
  classes: [{id, name, teacher_id, pin?, pin_expires_at?, members: [
    {id, username, display_name, last_seen}
  ]}],
  invites: [{id, class_id, class_name, teacher_name}],
  rooms: [{id, class_id, class_name, name, teacher_id, status, members_count}],
  room: { // Present for a requested room
    id, name, class_name, status, pin?, pin_expires_at?,
    players: [{room_id, user_id, username, display_name, status,
      question_index, score, total, mistakes, hints, skipped,
      elapsed_ms, timer_started_at, updated_at, last_seen}],
    my_attempt: state | null
  },
  server_now: 'ISO timestamp'
}
```

Only owners receive PINs. Student class `members` may be empty intentionally. Room statuses are `open`, `playing`, and terminal `closed`; player statuses are `waiting`, `playing`, `review`, `finished`, and `closed`. A game state uses the original root integration's camel-case `attemptId`, `roomId`, question IDs, index, stage, status, score, and timing fields.

The UI calls these actions:

| Action | Payload |
|---|---|
| `snapshot` | `{}` or `{room_id}` |
| `create_class` | `{name}` |
| `invite` | `{class_id, username}` |
| `accept_invite` | `{invite_id}` |
| `create_room` | `{class_id, name}` |
| `rotate_pin` | `{kind: 'class' | 'room', id}` |
| `join_pin` | `{pin}` |
| `join_room` | `{room_id}` |
| `set_room` | `{room_id, status: 'playing' | 'closed'}` |
| `start_attempt` | `{room_id}`; returns `{state}` |

Mutations return a refreshed snapshot and may include top-level `class_id`, `room_id`, and `invite_id`. The UI uses returned IDs to open the owning class or room, then requests the authoritative current snapshot. A PIN join without a room ID returns to the class overview. A closed room is never offered a reopen control. Closing uses an inline confirmation naming the room and permanent consequence; Escape cancels that confirmation.

## Refresh, timing, and accessibility

Teacher room views subscribe to progress changes. Dashboards and all student portal views refresh every 15 seconds. A missing/error/timed-out subscription uses 15-second polling; a subscription without a status response switches its label to polling after 10 seconds. Hidden tabs skip polling; returning to the tab revalidates. Snapshot calls are coalesced so they never overlap. Epoch, account identity, operation, and subscription-generation guards discard late work after navigation, leaving, or account changes. Mutations block duplicate activation and pause snapshot rendering while the mutation is pending. No form data is written to persistent client storage. Unsaved account fields remain in the current form on errors; dashboard inputs and focus survive refreshes, including IME composition.

Presence uses `last_seen` within 45 seconds of the server clock, estimated from `server_now`. Browser network hints are never used as proof of server availability. Dates/times use `ms-MY` and `Asia/Kuala_Lumpur`. A stable banner keeps the last readable snapshot on a failed refresh and clears after a successful retry.

The board ranks actual attempts by score descending, answering elapsed time ascending, then username for deterministic equal values. Waiting students have blank score/time/rank values and “Belum menjawab”; no completed result is inferred from waiting. `elapsed_ms` advances locally only for `playing` with `timer_started_at`, using the server-clock offset. Review and waiting time do not increment it. Current versus final scores and actual finished counts are labelled explicitly. The root/server remains responsible for authoritative game timing and status.

Roster and leaderboard tables render 20 rows per page; room cards render six per page. Native tables, labelled scroll regions, visible focus, actual buttons, field labels, inline errors with `aria-describedby`/`aria-invalid`, first-error focus, stable live regions, and copy fallback selection support keyboard use. Forms use `novalidate`. There are no custom select/date widgets and no native `alert`, `confirm`, or `prompt`. Inline confirmations are non-modal. The document owns vertical scrolling; table overflow is horizontal. Existing app reduced-motion and forced-colours support is retained and extended.

## Theme token mapping

`style.css :root` remains the canonical light palette described by `DESIGN.md`. `portal.css :root[data-theme="dark"]` adapts those **same** semantic names to dark surfaces; it does not invert geometry artwork. Shared game panels, fields, radio controls, scanners and states, cards, drag ghost, correction/review/analysis surfaces, results, score boards, help/pause dialogs, kbd, warning panels, decorative grid and scrollbars have explicit overrides where the original CSS uses light literals.

Dark text roles use `--ink: #E8F1FA`, `--muted: #AFBFCE`, `--primary: #97BBFF`, `--success: #80DAB7`, and `--danger: #FFA49D` on `--surface: #1A2B3C` / `--bg: #101C29`. The filled action adapter is `--portal-primary-fill: #255AD6` with white text, preserving text-link brightness without lowering filled-button contrast. Header controls wrap on narrow screens so the new account and theme buttons remain reachable.

## Verification performed

- `node --check dist/portal.mjs` and `node --check dist/theme.mjs` passed.
- `npm test` passed all 39 tests, and `npm run check` passed the existing syntax/assets/ARIA/geometry/token/accessibility baseline checks.
- Strict frontend premium project audit passed with zero findings; temporary evidence: `/tmp/geodecoder-portal-premium-audit.json`.
- 12 mocked portal contract checks passed: role-specific watch behavior, real score/time ordering, waiting blanks, escaped user text, confirmation/Escape, original-game handoff, non-overlapping snapshots, stale account and mutation rejection, preserved auth errors, one-time recovery/session behavior, and retry recovery.
- Eight mocked theme checks passed: system startup, saved override, toggle labels/storage, system-change policy, cross-tab preference, blocked-storage fallback, and listener cleanup.
- Thirty rendered HTML fragments were parsed: 15 forms have `novalidate`, 28 inputs have labels, description targets exist, IDs are unique within each screen, and buttons specify their type.
- Stylesheet braces and absence of global inversion checked. Nine representative semantic light/dark text pairs exceeded 4.5:1 contrast; dark body 12.64:1, muted 7.68:1, filled primary 5.98:1.

These contract checks used a minimal mock DOM and did not exercise browser layout, a screen reader, the live backend, or actual clipboard permissions. The root integration owns browser verification: both themes across entry/game/review/results/dialogs, narrow header wrapping, auth success/failure, class invite/PIN membership, teacher/student room updates, finished-game restoration, and keyboard focus.
