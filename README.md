# tickets-handler

Arquitectura `ddd` sobre `nestjs`. Las capas están descritas en `src/README.md`.

## Scripts

- `pnpm run dev`: servidor en modo watch.
- `pnpm run build`: compila a `dist/`.
- `pnpm run validate`: tipos, lint y tests; el reporte queda en `.ai/test-report.json`.

## Módulo de referencia

`POST /users` recorre caso de uso `CreateUser` → contrato `Repository` → adaptador del ORM, compuestos en `src/infrastructure/di/container.ts`. Copia ese patrón para módulos nuevos.
