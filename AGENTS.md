# AGENTS.md - Root Configuration

## Project Summary
**Voyagerss** is a unified financial analytics platform consisting of a high-performance backend and a modern frontend. It integrates various financial data sources (like aviation, stock market, etc.) and provides a rich user interface for data analysis.

## Tech Stack
- **Languages**: TypeScript, JavaScript
- **Backend**: Node.js, Express, Prisma (ORM), MySQL/SQLite/PostgreSQL
- **Frontend**: Vue 3, Vite, Quasar Framework, Pinia, Chart.js
- **Tools**: ESLint, Prettier, Jest

## Naming Conventions
- **Files/Directories**: kebab-case (e.g., `user-profile.vue`, `api-service.ts`)
- **API Routes**: snake_case (e.g., `/api/user_profile`)
- **Variable/Functions**: camelCase (e.g., `getUserData`)
- **Components**: PascalCase (e.g., `AssetGrid.vue`)

## Coding Patterns
- **Modularity**: Use a module-based architecture. Keep logic separated by domain.
- **Data Fetching**: Use unified API modules with standard response handling.
- **Styling**: Centralize SCSS styles and tokens. Avoid ad-hoc utilities.

## Operational Commands
- **Setup**: `npm install` (in both `/frontend` and `/backend`)
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Agent Rules
- Always refer to the localized `AGENTS.md` in sub-folders for specific layer rules.
- Follow the **SOLID**, **DRY**, **KISS**, and **YAGNI** principles.
- Use **antigravity** specific tools (task boundaries, artifacts) for complex changes.
