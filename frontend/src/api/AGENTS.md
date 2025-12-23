# AGENTS.md - Frontend API

## Summary
Handles all outgoing HTTP requests to the backend and external services.

## Rules
- **Client**: Use the centralized Axios instance.
- **Modules**: Group API calls by module (e.g., `api-assembly.ts`, `dartApi.ts`).
- **Types**: Always define request and response interfaces for API calls.
- **Error Handling**: Use the global error handler or standardized try-catch blocks.
- **Data Transformation**: Perform necessary data formatting (like date conversions) within the API module or a dedicated utility before returning to the component.
