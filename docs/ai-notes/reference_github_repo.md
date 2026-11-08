---
name: reference-github-repo
description: "Shopno Bilash Properties' GitHub repo and push workflow"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-10-19T11:33:51.437Z
---

Code lives at `https://github.com/sakib69alive/Shopno-Bilash-Proparties` (remote URL changed at some point from the earlier `akib239/...` — verify with `git remote -v` if this ever looks wrong again). As of 2026-10-19, `git fetch origin` works fine from this machine (read access is fine), but `git push` gets a 403 "Permission ... denied to akibur-rahman99" — so this session/machine can read the remote but not write to it. The user pushes local commits himself via GitHub Desktop; Claude's role is commit locally with clear messages and tell the user what's ready to push, never claim a push happened or assume the remote state without asking him.

Local project git repo is independent (its own `.git`), initialized inside a subfolder of a larger, unrelated parent repo — never touch anything outside `E:\website\Shopno Bilash Proparties` when doing git operations here.
