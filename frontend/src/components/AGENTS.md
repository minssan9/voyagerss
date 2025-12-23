# AGENTS.md - Frontend Components

## Summary
Contains all reusable Vue components for the Voyagerss frontend application.

## Rules
- **Framework**: Strictly use **Quasar** components for UI elements.
- **Naming**: PascalCase for component filenames (e.g., `AssetGrid.vue`).
- **Responsive**: Use Quasar's Grid system and SCSS for mobile-first responsive design.
- **Data Flow**: Use props for input and emits for output. For complex state, use Pinia stores.
- **Styling**: Use standardized utility classes from `@/assets/styles`. Avoid inline styles.
- **Documentation**: Briefly comment on complex props or computed properties.
