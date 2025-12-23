# AGENTS.md - Backend Modules

## Summary
The `modules` directory contains all domain-specific logic. Each module should be self-contained as much as possible.

## Rules
- **Structure**: Each module (e.g., `investand`, `aviation`) should have its own `controllers`, `services`, `repositories`, and `routes.ts`.
- **Isolation**: Minimize cross-module dependencies. Use public interfaces or dedicated shared services if communication is needed.
- **Routes**: Define module routes in a local `routes.ts` and mount them in the main app.
- **Init**: Each module may have an `init.ts` for setup/initialization logic.
