# ADR-001: True Route-Based React Router Navigation over Component State Switching

## Status
Accepted

## Context
Initial iterations of the frontend UI managed module navigation and page switching using internal React component state flags (`activeTab`, `currentView`). This resulted in severe usability defects across the application:
- The browser URL remained stuck at `http://localhost:5173/` regardless of which screen was rendered.
- Browser **Refresh (F5)** reset the application state to default.
- Browser **Back** and **Forward** buttons were disabled or navigated away from the application entirely.
- **Deep-linking** and **Bookmarking** specific configuration screens or child workspaces were impossible.

This architecture could not scale to the multi-module eREQUEST360 platform.

## Decision
Adopt **React Router 6+ True Route-Based Navigation** across all frontend modules. 

Every view, form, detail inspector, and child relationship workspace MUST be mapped to an explicit, distinct URL route (reference implementation established by `SCR-003 Card Programmes Master`):
- Master Management List: `/card-programmes`
- Dedicated Create Form: `/card-programmes/new`
- Parent Details Inspector: `/card-programmes/:id`
- Dedicated Edit Form: `/card-programmes/:id/edit`
- Child Workspaces: `/card-programmes/:id/segments`, `/charges`, `/references`, `/audit`

Furthermore, enforce the **Route Separation Standard**: frontend React Router routes SHALL NEVER reuse backend REST API paths (reserved prefixes `/config`, `/auth`, `/iam`, `/maker-checker`). Clean business routes (`/card-programmes`, `/branches`, `/card-types`, `/users`, `/roles`) must be used instead.

## Consequences
### Positive
- **Browser Refresh (F5)** reloads and preserves the exact view context and route.
- **Browser Back & Forward** navigation works predictably without page state loss.
- Operations staff and administrators can **bookmark and share deep-links** directly to specific records and child workspaces.
- Prevents routing collisions between Vite SPA client-side routes and FastAPI server-side REST API endpoints.

### Negative
- Components must read route parameters via React Router hooks (`useParams`, `useNavigate`, `useLocation`) rather than relying purely on parent prop callbacks.

## Alternatives Considered
1. **Component State Switching (`useState` view flags)**: Rejected due to broken browser history, broken refresh, and lack of deep-linking capabilities.
2. **Reusing REST API Paths for Frontend URLs (e.g. `/config/card-programmes`)**: Rejected to eliminate routing collisions between client SPA routing and server REST endpoints.

## References
- `docs/ui/navigation.md` (Frontend Route Naming Convention)
- `docs/ui/screen_registry.md` (Route Separation Standard)
- `docs/ui/ui_standards.md` (Section 4: React Router)
- `docs/architecture/eREQUEST360_Architecture_v1.0.md` (Section 1 & 4)
