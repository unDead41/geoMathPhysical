# Review and regression fixes

A fresh read-only review identified four important issues. All were reproduced
with failing regressions before the fixes below. Two additional review findings
were also addressed. Two implementation helpers worked within separate file
ownership after the user explicitly requested their help.

| Finding | Final behavior and evidence |
|---|---|
| Account change closed the controller before the app rebuilt the iframe | Track rendered iframe ownership separately; clear it before any awaited Auth work. Browser case removes A's draft, accepts B's reflection and removes B's draft on logout. |
| Null INITIAL_SESSION after offline refresh failure changed the owner to guest | Preserve remembered ownership only while SDK storage still identifies that owner; explicit signout clears it. Signed-in SDK recovery remains owner/session bound. |
| Failed device save could later be reported synced | Keep canonical unsaved events in owner-partitioned memory; persist before delivery. Shared writes, stale reads, late acknowledgements and other-tab writes cannot produce false success. A continued storage failure remains explicit. |
| HTTP 401 was read from the wrong response property | Classify PostgREST's top-level HTTP status and expired-JWT codes; request sign-in for Auth failures and keep network/5xx transient. |
| Native module retry stayed halted after RPC installation | Explicit module sync retries force one attempt without creating a background retry loop. |
| Icon/manifest-only changes did not invalidate the cache | Fingerprint every cached asset and worker policy using length-delimited inputs. |

Further targeted regression checks cover a matching cached owner whose SDK token
refresh temporarily fails. Pre/post RPC checks retain network backoff while
account/session mismatches continue to block the request. No extra Auth init or
heartbeat is introduced.

Existing app tests used arbitrary non-UUID account labels. Their fixtures now use
realistic Supabase UUIDs with the same ownership assertions. Browser fixture
callbacks use Locator.evaluate's second argument for data; update verification
uses a stable document marker because the application owns document.title.

No hosted Auth/migration, deployed Pages headers, physical-device installation or
audio, production-scale capacity, or browser-closed delivery was inferred from
these tests. Final command receipts and file hashes are in evidence/verification.json.
