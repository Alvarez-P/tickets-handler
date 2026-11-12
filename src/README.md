# Arquitectura DDD

- `domain/entities/`: entidades y agregados con identidad, con sus invariantes.
- `domain/value-objects/`: objetos de valor inmutables.
- `domain/repositories/`: contratos de persistencia expresados como interfaces.
- `domain/events/`: eventos de dominio.
- `domain/errors/`: errores de dominio (`DomainError`).
- `domain/services/`: servicios de dominio sin infraestructura.
- `application/use-case.ts`: contrato `UseCase`.
- `application/ports/`: puertos de salida que necesita la aplicación (unidades de trabajo, outbox, email, tokens, caché, búsqueda…).
- `application/use-cases/`: orquestan el dominio; implementan `UseCase`.
- `infrastructure/inbound/`: adaptadores de entrada que solo invocan casos de uso: `http/`, `graphql/`, `events/`, `cqrs/`, `rate-limit/`.
- `infrastructure/outbound/`: adaptadores de salida que implementan los puertos: `persistence/`, `messaging/`, `cache/`, `search/`, `email/`, `outbox/`, `security/`, `clock/`.
- `infrastructure/observability/`: trazas y health checks.
- `infrastructure/di/`: raíz de composición; es el único lugar que conoce las implementaciones concretas y las conecta.
- `shared/`: utilidades genéricas sin conocimiento del negocio (config, logging, utils, contexto de correlación).
- `test/support/`: dobles en memoria para los tests.

`domain` no importa de ninguna otra capa; `application` solo importa de `domain` y `shared`; `shared` no importa de ninguna capa.
