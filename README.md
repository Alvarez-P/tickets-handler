# tickets-handler

Servicio de gestión de tickets de soporte. Arquitectura `ddd` sobre `nestjs`, con PostgreSQL (Drizzle), Kafka, Redis y Elasticsearch. Las capas están descritas en `src/README.md`.

## Puesta en marcha

### Con Docker Compose

```sh
cp .env.example .env
docker compose up --build
```

Levanta la infraestructura y tres servicios de la aplicación:

| Servicio | Función |
|---|---|
| `migrate` | Aplica las migraciones y crea el administrador (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Termina al acabar. |
| `api` | REST y GraphQL en `http://localhost:3000`; documentación Swagger en `/docs` (JSON en `/docs-json`). |
| `worker` | Consume eventos de Kafka: proyección de tickets en Elasticsearch y notificaciones por correo. |

Herramientas auxiliares: Jaeger en `http://localhost:16686` y Mailpit en `http://localhost:8025`.

### En local

Requiere Node `>=22.12` y pnpm. Con la infraestructura de Compose en marcha (`docker compose up postgres kafka redis elasticsearch jaeger mailpit`):

```sh
pnpm install
pnpm db:migrate
pnpm seed:admin
pnpm dev          # api
pnpm dev:worker   # worker
```

## Scripts

| Script | Descripción |
|---|---|
| `dev` / `dev:worker` | API o worker en modo watch. |
| `build` | Compila a `dist/`; `start` y `worker` ejecutan el resultado. |
| `validate` | Tipos, lint y tests; el reporte queda en `.ai/test-report.json`. |
| `test:unit` / `test:e2e` / `test:integration` | Suites por separado; la de integración necesita la infraestructura levantada. |
| `db:generate` / `db:migrate` / `db:push` | Migraciones con drizzle-kit. |
| `seed:admin` | Crea el usuario administrador. |
| `reindex:tickets` | Reconstruye el índice de tickets en Elasticsearch. |

## API

Autenticación OAuth2 con `POST /oauth/token` (`grant_type` `password` o `refresh_token`); el resto de rutas usan `Authorization: Bearer <token>`. Roles: `admin`, `support-agent`, `specialist-agent`.

| Ruta | Roles |
|---|---|
| `GET /health`, `GET /health/ready` | público |
| `POST /invitations/accept` | público (token de invitación) |
| `GET /me` | autenticado |
| `POST /users`, `GET /users/:id` | `admin` |
| `POST/GET /admin/agents`, `GET/PATCH /admin/agents/:id` | `admin` |
| `POST/GET /admin/specialties`, `PATCH /admin/specialties/:id/active` | `admin` |
| `POST /tickets` | `admin`, `support-agent` |
| `GET /tickets`, `GET /tickets/:id`, `POST /tickets/:id/transitions` | los tres roles |

GraphQL expone por ahora solo la consulta `health`.

### Ciclo de vida del ticket

Al recibirse, el ticket se clasifica y se asigna a un agente de la especialidad activa de su tipo. Las transiciones se piden con `action`:

```
received ──(auto)──▶ assigned ──start-solving──▶ solving ──solve──▶ solved
                                                  │  ▲
                                            pause │  │ resume
                                                  ▼  │
                                                 paused
```

`cancel` está disponible desde cualquier estado no final.

## Eventos

Los casos de uso escriben en un outbox transaccional y un relay los publica en Kafka:

- `ticket.events`: proyección de tickets en Elasticsearch.
- `staff.events`: envío de la invitación al crear un agente.

Los mensajes que fallan tras los reintentos van a `<topic>.dlq`.

## Módulo de referencia

`POST /users` recorre caso de uso `CreateUser` → contrato `Repository` → adaptador del ORM, compuestos en `src/infrastructure/di/container.ts`. Copia ese patrón para módulos nuevos.
