## SCR-003 Card Programmes Master

### Architectural Pattern
Dedicated **Master → Detail Navigation Architecture** (React Router True Route-Based Navigation).

### Frontend React Router Routes
- `/card-programmes` (Management List)
- `/card-programmes/new` (Dedicated Create Form Page)
- `/card-programmes/:id` (Aggregate Parent Details)
- `/card-programmes/:id/edit` (Dedicated Edit Form Page)
- `/card-programmes/:id/segments` (Customer Segment Eligibility Workspace)
- `/card-programmes/:id/charges` (Fee Profiles & Charge Posting Workspace)
- `/card-programmes/:id/references` (Reference Data Mapping Workspace)
- `/card-programmes/:id/audit` (Audit Trail & Change Log Workspace)

### Backend API Endpoints (Unchanged)
- `GET /config/card-programmes`
- `POST /config/card-programmes`
- `PUT /config/card-programmes/{id}`
- `DELETE /config/card-programmes/{id}`

### Route Separation Standard

The eREQUEST360 frontend uses React Router with clean business-oriented URLs.

Frontend routes **must never** reuse backend REST API paths.

Reserved backend API prefixes include:

- `/auth`
- `/config`
- `/iam`
- `/maker-checker`
- `/eligibility`
- `/request`
- `/audit`

Examples:

| Frontend | Backend API |
|----------|-------------|
| `/card-programmes` | `/config/card-programmes` |
| `/branches` | `/config/branches` |
| `/card-types` | `/config/card-types` |
| `/users` | `/iam/users` |
| `/roles` | `/iam/roles` |

This separation ensures:

- Browser Refresh (F5) works.
- Deep linking and bookmarks work.
- Browser Back/Forward navigation works.
- React Router never conflicts with FastAPI REST endpoints.

### Child Operations

**Segments (`/card-programmes/:id/segments`)**
- Assign Segment
- Remove Segment
- Set Priority Rank (P1, P2...)
- Set Default Fallback Flag

**Charges (`/card-programmes/:id/charges`)**
- Add Fee Entry
- Edit Entry
- Delete Entry
- Multi-column Posting Ledger (Sequence, DR/CR, Narration, GL Account, Amount, Currency)

**Audit (`/card-programmes/:id/audit`)**
- Read Only Timeline & Change History Table

**References (`/card-programmes/:id/references`)**
- Read Only Mapping Grid & External Codes