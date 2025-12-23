# AGENTS.md - Frontend Layer

## Project Summary
The frontend layer of Voyagerss is a single-page application built with **Vue 3** and **Quasar**. It provides a responsive and dynamic interface for financial data visualization and management.

## Tech Stack
- **Framework**: Vue 3 (Composition API)
- **UI Framework**: Quasar Framework (v2)
- **State Management**: Pinia
- **Build Tool**: Vite
- **Styling**: SCSS (Vanilla CSS principles), Quasar Grid System
- **HTTP Client**: Axios
- **Charts**: Chart.js, Vue-Chartjs

## Naming Conventions
- **Components**: PascalCase (e.g., `MyComponent.vue`) in `src/components/`
- **Views**: PascalCase (e.g., `Dashboard.vue`) in `src/views/`
- **Types/Interfaces**: PascalCase (e.g., `UserData.ts`)
- **Variables/Functions**: camelCase (e.g., `isLoading`, `fetchData`)
- **Base Path Alias**: Use `@` to refer to the `src` directory (e.g., `@/components/Button.vue`).

## Coding Patterns
- **Script Setup**: Always use `<script setup lang="ts">`.
- **Functional Patterns**: Use functional and declarative programming patterns; avoid classes.
- **VueUse**: Leverage **VueUse** functions where applicable.
- **Styling**: Standardize styles in `src/assets/styles`. Avoid scoped styles if they can be global tokens.
- **API Handling**: response should follow the structure:
  - `const response = await api.get(...)`
  - `rows.value = response.data.content;`
  - `total.value = response.data.totalElements;`

## Operational Commands
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

## Performance Optimization
- Optimize Web Vitals (LCP, CLS, FID).
- Use dynamic loading for non-critical components.
- Optimize images using WebP format where possible.
