---
description: Crea git worktree en .worktrees desde nombre dado
---

Toma nombre completo desde skins globales de juego. Deriva SLUG: trim, minúsculas, espacios y `_` a `-`, borra `[^a-z0-9-]`, colapsa `--+` a `-`, trim `-` en bordes. Si vacío tras sanitizar: pide nombre, detente.

Ejecuta único comando, sin cambiar directorio:

`git worktree add .worktrees/<SLUG>`

Prohibido: `cd`, otros git, mkdir extra, segundos comandos.
- Si el argumento es muy largo simplificalo a un nombre significativo.