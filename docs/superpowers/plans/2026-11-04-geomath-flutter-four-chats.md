# GeoMath Flutter Four-Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membina dan menjalankan GeoMath Flutter pada Android melalui empat
chat yang mempunyai pemilikan fail, kontrak dan bukti penerimaan jelas.

**Architecture:** Native Flutter shell, akaun/kelas dan permainan; geometri
canonical JS dibundel offline melalui WebView. Foundation membekukan interfaces,
kemudian learning dan cloud/game dibangunkan serentak. Integrator menyatukan
composition, platform dan hasil ujian sebelum memajukan branch `app`.

**Tech Stack:** Flutter/Dart stable yang disahkan semasa kickoff, Material3,
local WebView, SQLite, protected session storage dan existing Supabase gateway;
SDK/packages dipin pada pelaksanaan sebenar.

**Spec:** [SOR](../../geomath-app/SOR.md),
[architecture](../../geomath-app/ARCHITECTURE.md),
[common execution contract](../../geomath-app-prompts/COMMON_RULES.md),
[prompt index](../../geomath-app-prompts/README.md).

## Global Constraints

- Repo sama `unDead41/geodecoder`; app `apps/geomath_flutter/`; Android dahulu.
- 48 screen IDs dan16 EX states;11 model belajar dan5 game shapes termasuk cone.
- Warna stable physical face, label selain warna; game assets neutral.
- UI/preferences/session/database satu pemilik; data+outbox satu transaction.
- 6 worker awal serentak selepas audit; tambahan mengikut keperluan dalam runtime.
- Prompt1 dahulu, Prompt2/3 selari pada SHA foundation sama, Prompt4 akhir.
- Branch `app-foundation`, `app-learning`, `app-cloud-game`, `app-integration`.
- Prompt4 sahaja boleh fast-forward app; tiada main/web/firmware/backend/Pages/store push.
- Arkib docs/geomath-app tidak diubah; source lama diperiksa semula ketika kickoff.

## Review Focus

1. SDK/emulator/WebView tiada atau aset rosak: Prompt1 gate membezakan blocked
   daripada run sebenar dan offline-ready hanya bagi aset sah.
2. Shared contract berubah ketika chat selari: Prompt2/3 mengesahkan SHA/hashes,
   Prompt4 menolak gabungan tidak sepadan sehingga reconciliation selesai.
3. Message/callback/flush lama selepas A→B/logout: Prompt2 bridge dan Prompt3
   session/outbox tests memastikan tiada data/credential merentas actor.
4. Provider/RPC/deep link tiada atau denied: Prompt3 negative tests serta Prompt4
   acceptance memaparkan capability sebenar tanpa fake success/deploy automatik.
5. OS kill/offline/unknown acknowledgement: Prompt3 parity/persistence/Duel tests
   dan Prompt4 real Android tests membezakan local pause daripada server deadline.

## Task 1: Runnable foundation dan kontrak freeze

**Files:** Create/sambung `apps/geomath_flutter/` shared bootstrap/core/platform,
SOURCE_LOCK, FOUNDATION_CONTRACT/READY, foundation tests dan handoff.
**Interfaces:** Consumes source/SOR/design; produces frozen typed ports,
FeatureContribution, canonical exports dan verified foundation commit.

- [ ] Laksanakan [Prompt01](../../geomath-app-prompts/01-flutter-foundation.md).
- [ ] Uji kontrak, analyze/test/debug-build dan Android WebView/offline smoke.
- [ ] Commit/push app-foundation; report remote head untuk kedua-dua chat feature.

## Task 2: Learning feature

**Files:** `lib/features/learning/**`, assets/module, tools/module,
learning tests/preview dan integration request/handoff.
**Interfaces:** Consumes frozen ports/source lock; produces learning contribution,
13 screen implementations,11model, refleksi melalui writer port dan asset manifest.

- [ ] Sahkan SHA foundation yang sama dengan Task3.
- [ ] Laksanakan [Prompt02](../../geomath-app-prompts/02-flutter-learning.md).
- [ ] Verify math/bridge/offline/lifecycle/visual; push app-learning sahaja.

## Task 3: Cloud, kelas dan game feature

**Files:** `lib/features/{auth,profile,classroom,solo,duel,sync}/**`,
feature tests/preview, migrations dan integration request/handoff.
**Interfaces:** Consumes frozen ports/bank/goldens/neutral cards; produces feature
contributions, concrete auth/gateway/atomic writer/sync dan29 screen/16EX states.

- [ ] Sahkan SHA foundation yang sama dengan Task2.
- [ ] Laksanakan [Prompt03](../../geomath-app-prompts/03-flutter-cloud-game.md).
- [ ] Verify JS parity, server contracts, owner/queue/CRUD/provider failure cases;
  push app-cloud-game sahaja dengan batas hosted yang jelas.

## Task 4: Integrasi dan Android delivery

**Files:** root shared Flutter files/registry/platform, SCREEN_ACCEPTANCE,
RUN_ANDROID, integration tests/screenshots/handoff; APP.md status sebenar.
**Interfaces:** Consumes kedua-dua contributions pada freeze sama; produces
production main entrypoint berfungsi, verified app branch dan APK jika dibina.

- [ ] Laksanakan [Prompt04](../../geomath-app-prompts/04-flutter-integration.md).
- [ ] Verify merged analyze/tests/device run/APK,48+16 coverage dan limits.
- [ ] Push app-integration, kemudian fast-forward app selepas gates lulus.

Plan ini menyusun pelaksanaan masa hadapan. Penyediaannya hanya menghasilkan
prompt/dokumen; tiada Flutter build, emulator, APK atau hosted rollout disahkan.
