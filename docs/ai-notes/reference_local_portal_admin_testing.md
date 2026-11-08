---
name: local-portal-admin-testing
description: "How admin and owner portal can be entered locally for UI checks (dev-login buttons, demo owner in dev.db)"
metadata:
  node_type: memory
  type: reference
  originSessionId: fbf70058-117a-4745-8596-44de719034d4
  modified: 2026-11-04T15:09:37.464Z
---

On localhost the login page has built-in "(dev)" buttons: Staff tab -> "Continue as Super Admin (dev)" signs in without a password, so admin screens CAN be browsed locally (supersedes the "can't log into admin" limitation for local checks). Owner portal: a demo owner (Rahim Uddin, Meridian Residences Unit A-502) was inserted into local dev.db; its phone/PIN are in scripts/demo-owner-login.txt. Project "demo-project" there has blueprint types with codes 01/02. Portal logout: submit the hidden desktop `aside form` via JS on phone viewport.

Related: [[feedback-cannot-login-to-admin]]
