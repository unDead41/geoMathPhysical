# Native module bridge

`ModuleHostBridge` captures the current native `ActorBinding`. It closes on any
actor/session/epoch/scope change or detached app lifecycle. Background/inactive
phases suspend commands without replacing module identity or state.

The native bridge envelope is exactly:

```json
{
  "nativeBridgeVersion": 1,
  "instanceId": "per-module-instance",
  "bridgeSession": "unshared-native-wrapper-capability",
  "command": "ready",
  "payload": {}
}
```

Only `ready`, `progress`, `open-settings`, `open-help` and allowlisted
`request-navigation` commands are accepted. The byte limit is inclusive 65536
UTF-8 bytes. Unknown keys are rejected, including fields claiming actor, epoch,
owner or credentials. The returned `ModuleCommand.binding` is always native.

Progress payloads retain the independent canonical `type`, `protocol: 1`,
`session`, `activity`, `stage`, `prediction`, `result`, `explanation`, `completed`
schema and canonical text limits 240/600/600. The progress session must differ
from the native wrapper capability. Settings channel `version: 1` and its
`instanceId` remain a third contract, implemented by the settings adapter.

`ModuleMessageContext` is supplied by the native adapter, never from JS fields.
`attachDocument(documentId)` pins a verified local document generation. Receiving
from another generation or untrusted document fails even with a valid envelope.

Android `webview_flutter` JavaScriptChannel does not identify the originating
frame. `ModuleSourceProof.wrapperCapability` explicitly records this limitation;
it does not claim native main-frame metadata. The adapter must pin the bundled
wrapper URL and generation, block untrusted navigation, initialize an unguessable
capability into a top-document closure, remove its bootstrap setter, and keep the
canonical child in an opaque sandbox. The wrapper validates
`event.source === iframe.contentWindow` before forwarding approved child data.
Neither the child nor URL/query/referrer/global getters receive the native
capability. A future platform adapter that really supplies frame metadata may
use `ModuleSourceProof.nativeMainFrame` after verifying that metadata.

The bridge validates schemas and capabilities; it never grants server
authorization. It has no auth token, RPC dispatch or user-selected owner port.
Audio and automatic motion pause through the shared lifecycle/audio owners;
preference snapshots update the existing module without navigating or reloading.
