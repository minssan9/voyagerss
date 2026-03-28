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

## Git Commit Rules
- **Format**: `<type>(<scope>): <subject>`
- **Agent Instruction**: **Antigravity must provide a suggested git commit message** following this format at the end of every task execution.
- **Types**:
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation changes
  - `style`: Formatting, missing semi-colons, etc. (no code change)
  - `refactor`: Code change that neither fixes a bug nor adds a feature
  - `perf`: Performance improvements
  - `test`: Adding or correcting tests
  - `chore`: Maintenance tasks, build/dependencies, etc.
- **Scopes**: Use the major module or directory name (e.g., `backend`, `frontend`, `root`, `api`).
- **Subject**: Use imperative, present tense (e.g., "add", not "added"). No period at the end.
- **Language**: English only.

## Agent Rules
- Always refer to the localized `AGENTS.md` in sub-folders for specific layer rules.
- Follow the **SOLID**, **DRY**, **KISS**, and **YAGNI** principles.
- Use **antigravity** specific tools (task boundaries, artifacts) for complex changes.

## Cursor Cloud specific instructions

### Services Overview
| Service | Port | Command |
|---------|------|---------|
| Backend (Express) | 9002 | `cd backend && TS_NODE_TRANSPILE_ONLY=true npm run dev` |
| Frontend (Vite) | 9003 | `cd frontend && npm run dev` |
| MySQL 8 | 3306 | `sudo mysqld --user=mysql &` |

### Database Setup
MySQL must be running before the backend starts. Four databases are required: `voyagers`, `workschd`, `investand`, `aviation` (user: `root`, password: `admin`). Environment variables are loaded from `/.env.local` at the repo root.

After installing backend deps, push schemas with:
```bash
export DATABASE_URL_WORKSCHD="mysql://root:admin@localhost:3306/workschd"
export DATABASE_URL_INVESTAND="mysql://root:admin@localhost:3306/investand"
export DATABASE_URL_AVIATION="mysql://root:admin@localhost:3306/aviation"
cd backend
npx prisma db push --schema=./prisma/workschd.prisma
npx prisma db push --schema=./prisma/investand.prisma
npx prisma db push --schema=./prisma/aviation.prisma
```

### Key Gotchas
- **Backend requires `TS_NODE_TRANSPILE_ONLY=true`** to start in dev mode. There is a pre-existing strict TypeScript error in `backend/src/modules/workschd/scraper/sites/inha-hospital.ts` (implicit `any` type in cheerio `.each()` callback) that blocks `ts-node` compilation.
- **No ESLint config files** are committed in the repo. Both `npm run lint` commands (backend/frontend) fail due to missing `.eslintrc` (backend) and missing `.gitignore` reference (frontend).
- **Backend test suite** (`npm test`) has pre-existing TypeScript compilation failures in several test files (outdated service methods, module path issues). Tests run but none pass currently.
- **Frontend `npm install`** requires `--force` flag due to a Windows-specific `@rollup/rollup-win32-x64-msvc` dependency in `package.json`.
- **Account signup does not hash passwords** — the `AccountController.createAccount` stores plaintext passwords, but `AuthService.login` uses `bcrypt.compare`. Manually hash passwords or fix the controller for testing auth flows.
- **JWT field mismatch**: `AuthService` signs tokens with `userId` but `authMiddleware` checks `decoded.accountId`, causing authenticated endpoints to return "Invalid token". This is a pre-existing bug.
- **Prisma CLI** needs env vars exported (or a `.env` file in `backend/`) since the app loads env from `../.env.local` at runtime but Prisma CLI looks in the schema directory.
