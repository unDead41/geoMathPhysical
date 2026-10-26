# Shared Module Settings Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for implementation in this session. Two subagents maximum, one localization owner and one independent final reviewer.

**Goal:** Keep game and module language, text size and decorative motion consistent.
**Architecture:** Existing parent preferences own state; an opaque srcdoc adapter receives versioned messages and translates authored module text in place.
**Tech Stack:** Native JavaScript, CSS, existing esbuild and Playwright.
**Spec:** docs/superpowers/specs/2026-10-26-module-settings-design.md.

## Global Constraints

- Continue digitalize-ease-of-use; its original parent is current digitalize adc51627eaaace5d9543c7e033d2994986c8715d.
- Candidate2.5.0; vendor module1.2.0 and firmware1.1.3 unchanged.
- No reset, duplicated stored settings, backend/module-branch write or Pages publication.

## Review Focus

- A setting changes during iframe startup or after a previous frame was closed.
- An unrelated window/old instance sends forged settings requests.
- Large English text fits 320px without changing canvas geometry.
- Module measurement inputs, active lab, face selection and net progress survive.
- Reduced-motion/device changes stop movement without silently restarting it.

### Task1: Shared preference transport

Files: dist/module-frame.mjs, module-settings.mjs, app.mjs; tests/module-settings.browser.mjs and module-frame.test.mjs.
Interface: createModuleBridge({frame,getSettings,openSettings,hostWindow}) -> {open,sync,clear}; prepareModuleFrame(html,{settings,instanceId}).
- [x] Observe browser RED: English150%/paused does not reach current BM module.
- [x] Add strict message/instance/source validation, initial bootstrap, load/ready sync and one host Settings entry.
- [x] Apply text scaling and user/device reduced-motion without replacing frame state.

### Task2: Module language

Files: dist/module-copy.mjs, module-language.mjs; module-language tests.
Interface: installModuleLanguage({language,catalog}) -> {setLanguage,translate,refresh}.
- [x] Test canonical reversible and dynamic DOM/canvas language behavior RED→GREEN.
- [x] Localize Explore, Notes and all four Labs with the existing glossary; retain IDs/values/formulas.

### Task3: Verification and delivery

Files: digital docs, package/lock/core version, generated bundle/four HTML aliases, evidence.
- [x] Verify desktop/mobile BM/English100/125/150, initial/live/persist, OS reduced motion and denied storage.
- [x] Verify local game state and module activities unchanged; offline zero static requests.
- [x] Independent whole-change review, resolve material findings and run full suite/build/check/SOR.
- [x] Commit/push existing branch with lease on db5acf197175bc4d517bdf2e9c5338a9c9dff468 and verify remote SHA.
