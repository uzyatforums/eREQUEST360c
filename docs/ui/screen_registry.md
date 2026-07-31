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