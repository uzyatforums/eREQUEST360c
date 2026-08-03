# ADR-006: Nigerian Currency Formatting Standards (NGN & ₦ Standard)

## Status
Accepted

## Context
eREQUEST360 is an enterprise multi-tenant card lifecycle management platform deployed primarily for financial institutions operating in Nigeria, while retaining multi-currency capability.

In initial UI mockups and prototypes, generic dollar signs (`$`) and Lucide `DollarSign` icons were inadvertently used across monetary input fields, table header ledgers, and fee summary cards. This created cognitive dissonance for local bank operations staff, failed to reflect Nigerian banking standards, and introduced confusion regarding fee ledger currencies.

## Decision
Standardize all monetary formatting, input controls, and financial icons across eREQUEST360 according to **Nigerian Currency Standards**:

1. **Data Grids & Ledgers**: Data table column headers, summary ledgers, and transaction tables MUST use the 3-letter ISO 4217 code **`NGN`** (e.g. `Amount (NGN)`, `Fee (NGN)`).
2. **Monetary Form Inputs**: Form input fields capturing monetary values MUST display numeric values only. Currency symbols (₦, $, €, £, etc.) MUST NOT be embedded inside input fields; monetary fields inherit their currency context from the parent business entity.
3. **Icon Guidelines**: Dollar (`$`) icons (such as `DollarSign`) SHALL NOT be used for general financial fields unless specifically representing US Dollar (USD) transactions. Neutral banking icons (`Receipt`, `Banknote`, `CreditCard`, `Ledger`) or styled Naira text badges (`<span className="...">₦</span>`) MUST be used instead.

## Consequences
### Positive
- **Domain Fidelity**: Aligns visual presentation with real-world Nigerian banking conventions.
- **Clarity**: Eliminates ambiguity between local Naira fee charges and foreign currency transactions.
- **Consistency**: Enforces uniform input prefixing and grid column formatting across all present and future modules.

### Negative
- Non-NGN monetary entries (e.g. USD, EUR) must be explicitly handled with conditional ISO prefixing.

## Alternatives Considered
1. **Generic Dollar (`$`) Formatting**: Rejected as visually inaccurate for Nigerian banking operations.
2. **Unformatted Numeric Inputs**: Rejected because unformatted numbers fail to communicate currency context to bank operators.

## References
- `docs/ui/ui_standards.md` (Section 16: Currency Standards)
- `docs/ui/component_library.md` (Section 3.3: Form Input & Select Controls)
- `docs/ui/screen_registry.md` (SCR-003 Specifications)
