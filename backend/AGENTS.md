# AGENTS.md - Backend Layer

## Project Summary
The backend layer of Voyagerss is a modular Node.js application that serves as the central API and data processing hub. It handles business logic, database interactions via Prisma, and external API integrations.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Language**: TypeScript
- **Authentication**: JWT, BCrypt
- **Documentation**: Swagger (swagger-ui-express)
- **Scheduling**: node-cron

## Naming Conventions
- **Files**: kebab-case (e.g., `user-service.ts`)
- **API Routes**: snake_case (e.g., `@Post("/create_user")`)
- **Variables/Functions**: camelCase
- **Classes/Interfaces**: PascalCase
- **Database Tables**: snake_case (managed by Prisma)

## Coding Patterns
- **Layered Architecture**: Controller -> Service -> Repository/Prisma.
- **DTOs**: Use Data Transfer Objects for carrying data between layers.
- **Error Handling**: Use a global exception handler. Controllers should use try-catch and delegate to the handler.
- **Prisma**: All database operations must go through Prisma clients.
- **Principles**: Strictly adhere to **SOLID**, **DRY**, **KISS**, and **YAGNI**.

## Operational Commands
- **Dev Mode**: `npm run dev`
- **Build**: `npm run build`
- **Test**: `npm run test`
- **Prisma Generate**: `npx prisma generate`

## API Response Format
All controllers should return a standardized response:
```json
{
  "result": "SUCCESS",
  "message": "Operation successful",
  "data": { ... }
}
```
In case of error:
```json
{
  "result": "ERROR",
  "message": "Error details",
  "data": null
}
```
