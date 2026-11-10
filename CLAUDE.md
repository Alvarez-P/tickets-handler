# Contexto Tecnológico del Proyecto (Generado por CLI)
- **Desarrollador:** Adolfo Esteban Alvarez Pacheco
- **Arquitectura:** ddd
- **Framework Base:** nestjs
- **Protocolos de Entrada/Salida:** rest, graphql, events
- **Infraestructura:** Docker Compose: Sí, AWS Emulation (LocalStack): No
- **Stack Tecnológico:** TypeScript, drizzle, kafka.

# Reglas de Oro
- Lee `src/README.md` antes de crear módulos nuevos: define las capas de la arquitectura.
- Mantén tipado estricto en TypeScript. Evita usar `any`. No escribas comentarios en el código.
- **Patrones de Diseño Obligatorios:** Todo desarrollo nuevo debe respetar el desacoplamiento estricto mediante interfaces, adaptadores y fachadas. Queda prohibido inyectar librerías de infraestructura directas en el dominio de negocio.
- **Cero Comentarios:** Queda estrictamente prohibido generar comentarios en el código nuevo. Utiliza un diseño autodocumentado basado en tipos robustos y semántica limpia.
- Arquitectura DDD: `src/domain` no importa nada de `application` ni `infrastructure`; los casos de uso en `src/application/use-cases` implementan `UseCase` y reciben repositorios por constructor; los adaptadores HTTP, GraphQL, WebSocket, gRPC y de eventos viven en `src/infrastructure` y solo invocan casos de uso.
- NestJS: cada protocolo vive en su propio módulo dentro de la capa de entrada de la arquitectura (ver `src/README.md`); registra los adaptadores de salida como providers con tokens de inyección ligados a interfaces.
- **Módulo de referencia:** `CreateUser` en `src/application/use-cases/create-user.use-case.ts` y su composición en `src/infrastructure/di/container.ts` son el patrón a copiar para módulos nuevos; las consultas pasan por `QueryAdapter` y los repositorios extienden la clase base de `src/infrastructure/persistence`.
- **Bucle de Validación:** Si realizas cambios de código, ejecuta siempre `pnpm run validate`. Si el reporte `.ai/test-report.json` contiene errores, corrígelos de inmediato de manera autónoma.
