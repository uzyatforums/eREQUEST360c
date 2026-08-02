# ADR-002: Dedicated Full-Page Maintenance Forms over Slide-Out Drawers

## Status
Accepted

## Context
Initial UI specifications required record creation and editing to take place inside slide-over Sheet drawers (`480px` width). However, enterprise banking configuration entities (such as Card Programmes `SCR-003`) require managing numerous fields:
- General Product Identifiers and scheme branding.
- Card scheme BIN parameters, platform indicators, service codes, PAN lengths, and validity periods.
- Financial pricing rules, issuance fees, maintenance fees, base currency, and account bindings.
- Operational channel permissions (instant print, contactless NFC, PIN mailer, web 3DS, ATM dispense).
- Audit metadata logs (`created_by`, `created_date`, `last_modified_by`, `version`).

Attempting to fit these complex fields into a narrow `480px` drawer caused severe visual clutter, excessive vertical scrolling, input truncation, and poor usability. Furthermore, drawer state could not be deep-linked or bookmarked.

## Decision
Replace slide-over edit drawers with **Dedicated Full-Page Maintenance Forms** operating on explicit React Router sub-routes (`/card-programmes/new` and `/card-programmes/:id/edit`).

Maintenance forms MUST be organized into 5 logical full-width sections:
1. **General Product Identity**: Primary codes, titles, scheme branding, active status.
2. **Card Scheme & BIN Parameters**: BIN routing, platform indicators, service codes, PAN lengths.
3. **Financial & Pricing Rules**: Base currency (`NGN`), fee amounts (`₦`), account type bindings.
4. **Operational & System Controls**: Channel toggles and feature flags.
5. **Audit Metadata (Read-Only)**: System-managed audit log metadata displayed in edit mode.

Slide-over Sheet drawers are reserved strictly for minor secondary child item additions (e.g. assigning customer segments or adding individual fee entries within child workspaces).

## Consequences
### Positive
- Provides 100% full screen width for clear multi-column field layouts and structured section grouping.
- Dedicated `/new` and `/:id/edit` URLs support browser refresh, back/forward history, and deep-linking.
- Renders read-only system audit metadata cleanly without cluttering primary inputs.
- Improves keyboard navigation and input validation clarity.

### Negative
- Navigating to a maintenance form replaces the master list view rather than overlaying it.

## Alternatives Considered
1. **Slide-Over Sheet Drawers (`480px` width)**: Rejected for primary entity maintenance due to horizontal space constraints and lack of deep-linking support.
2. **Modal Dialog Popups**: Rejected due to scrollability issues, backdrop masking, and poor usability on complex forms.

## References
- `docs/ui/ui_standards.md` (Section 7: Maintenance Forms)
- `docs/ui/eREQUEST360_Design_System_v1.1.md` (Section 5.2)
- `docs/ui/component_library.md` (Section 2)
- `docs/ui/screen_registry.md` (SCR-003 Specifications)
