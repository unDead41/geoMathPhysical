# Native module readiness acknowledgement

The native envelope, settings protocol and progress protocol remain version 1.
The private wrapper adapter is revision 2.

JavaScript channel enqueue does not establish native acceptance. Native checks
the pinned document URL asynchronously, then validates the current actor and
lifecycle. A readiness envelope can therefore be rejected while the application
is inactive, after the wrapper has already recorded that it emitted the message.

The wrapper now tracks emission and native acknowledgement separately. It retries
unacknowledged readiness on foreground activation. Native acknowledges only a
successfully validated readiness envelope, using the pinned controller directly
because the initial configuration reply may still be pending. Duplicate validated
readiness is acknowledged without repeating logical callbacks or acceptance
counts. The child never receives this acknowledgement API or native capabilities.

A regression against the actual bundled wrapper failed before the change
(one ready envelope instead of the required retry), then passed after it. The
ordinary background/foreground test now acknowledges a successful delivery before
asserting later resumes remain deduplicated. The native handshake deadline stays
30 seconds. Android integration also checks native acknowledgement and duplicate
readiness, and logs only bounded, whitelisted startup flags if loading is slow.

The observed CI cold-start timeout did not include enough startup diagnostics to
prove it took this race path. The source regression establishes a real missing
recovery path; the corrected device suite remains the acceptance gate.

The canonical prepared child, meshes, formulae, parsers, palettes and protocols
are unchanged. Only the wrapper template/bundle and private native receipt path
change; their manifest/provenance hashes are updated together.
