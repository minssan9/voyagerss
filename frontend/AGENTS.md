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
- **Styling**: Standardize styles in `src/assets/styles`. **Do NOT use scoped styles in views** broadly. Use global component classes defined in `components.scss` and utilities in `utilities.scss`.
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

## Design System Standards
- **Global Styles Directory**: `src/assets/styles/`
  - `components.scss`: Reusable UI components (Cards, Buttons, Inputs, Tables).
  - `utilities.scss`: Helper classes (Margins, Padding, Animations, Responsive).
  - `variables.scss`: Global styling tokens (Colors, Spacing, Fonts).
- **Module Identity**: Use defined gradient classes for branding:
  - Investand: `.investand-gradient` (Blue/Purple)
  - WorkSchd: `.workschd-gradient` (Cyan/Blue)
  - Aviation: `.aviation-gradient` (Green/Teal)
- **Component Patterns**:
  - **Cards**: Use `.app-card` or `.modern-card` for consistent elevation, headers, and hover effects.
  - **Buttons**: Use `.modern-button` with `--secondary` or `--tertiary` modifiers.
  - **Animations**: Use `.fade-in`, `.slide-up`, and `.stagger-{1-10}` classes for consistent entry effects.
- **Responsiveness**: Use `.mobile-hide` and `.desktop-hide` for visibility control.
