# Arquitectura DDD

- `domain/entities/`: entidades y agregados con identidad.
- `domain/value-objects/`: objetos de valor inmutables.
- `domain/repositories/`: contratos de persistencia expresados como interfaces.
- `domain/events/`: eventos de dominio.
- `domain/errors/`: errores de dominio (`DomainError`).
- `domain/services/`: servicios de dominio sin infraestructura.
- `application/use-cases/`: orquestan el dominio; implementan `UseCase`.
- `infrastructure/`: todo lo que toca el exterior, tanto de entrada como de salida:
  - `http/`, `graphql/`, `websocket/`, `grpc/`, `events/`: adaptadores de entrada que solo invocan casos de uso.
  - `persistence/`, `messaging/`, `cache/`, `auth/`, `cloud/`, `outbox/`, `email/`, `resilience/`, `classification/`, `rate-limit/`, `observability/`: adaptadores de salida que implementan los contratos del dominio.
  - `di/`: raíz de composición; es el único lugar que conoce las implementaciones concretas y las conecta.

El dominio no importa de `application` ni de `infrastructure`; `application` solo importa del dominio.
