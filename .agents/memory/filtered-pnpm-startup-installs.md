---
name: Filtered pnpm startup installs
description: Why FishTokri runtime workflows install filtered dependency closures sequentially.
---

Use separate, filtered pnpm installs for the API and Admin runtime workflows, and start them sequentially after a clean import.

**Why:** A full workspace install pulls an unrelated blocked code-generation package. Running two filtered installs concurrently can also race while writing the shared pnpm store links.

**How to apply:** Keep each runtime workflow scoped to its package dependency closure. When both need a fresh install, start the API first and wait for it to finish installing before starting the frontend.