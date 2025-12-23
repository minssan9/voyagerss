# AGENTS.md - Backend Services

## Summary
The `services` layer contains the core business logic of the module.

## Rules
- **Responsibility**: Services must handle all business rules, validations, and data processing.
- **Persistence**: Use Repositories or direct Prisma client calls (if simple) to interact with the database.
- **Inputs/Outputs**: Accept and return DTOs. Avoid leaking internal database models to the controller layer.
- **Transactional**: Use Prisma's `$transaction` for sequence operations that must be atomic.
- **Async**: All service methods should be `async` and return `Promises`.
- **Testing**: Services should be the primary focus of unit tests.
