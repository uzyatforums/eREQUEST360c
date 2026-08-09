# eREQUEST360 Implementation Roadmap

## Foundation

[x] IAM / Authentication
[x] Authorization / Permissions
[x] Audit Framework
[x] Maker / Checker Engine
[x] Approval Policy Framework
[x] Configuration Orchestrator
[x] Branch Configuration
[x] Effective Branch Resolution
[ ] Branch-based Data Scoping
[ ] Notification Framework
[ ] Dashboard

## Configuration Modules

[x] Branches
[x] States
[ ] Branch Clusters
[ ] Card Types
[x] Card Programmes
[x] Card Segments
[x] Card Segment Programmes
[ ] Card Charges Headers
[ ] Card Charge Entries
[ ] Card Segment Programme Charges
[ ] Couriers
[ ] Dispatch Types
[ ] Dispatch Statuses
[ ] Local Accounts
[ ] Email Recipients
[ ] Instant Card Types
[ ] Instant Card Statuses
[ ] Inventory Movement Types
[ ] Request Channels
[ ] Request Categories
[ ] Request Types
[ ] Processing Modes
[ ] Miscellaneous Lookups

## Request Processing

[ ] New Request
[ ] Request Validation
[ ] Eligibility Engine
[ ] Duplicate Detection
[ ] Special Approval
[ ] Maker / Checker Integration
[ ] State Machine
[ ] Workflow History

## Card Lifecycle

[ ] Card Issuance
[ ] Card Replacement
[ ] Card Renewal
[ ] Card Hotlisting
[ ] Card Linking
[ ] Card Activation
[ ] Card Dispatch
[ ] Card Acknowledgement
[ ] Instant Card Processing

## Operations

[ ] Charge Processing
[ ] Notification Delivery
[ ] Bulk Uploads
[ ] Reporting
[ ] Search
[ ] Dashboard Metrics

## Administration

[x] Users
[x] Roles
[x] Permissions
[x] Branch Assignment
[ ] Approval Policies UI
[ ] System Parameters

## Governance & Operational UX

[x] Maker / Checker Approval Queue
[x] Maker / Checker Approval Authorization
[x] Maker / Checker Segregation of Duties
[x] Activate / Deactivate Confirmation
[x] Maker / Checker Pending Count Synchronization
[ ] Work Item ID Display on Master Grids
[ ] Master Grid → Maker / Checker Review Navigation
[ ] Maker / Checker Target Row Focus / Highlight
[ ] Status Filter — Active as Default

## Backend APIs

[x] Authentication API
[x] Login Endpoint
[x] Configuration Framework
[x] Branch API
[x] Card Programme API
[x] Card Segment API
[x] Card Segment Programme API
[x] Eligibility API Registration
[ ] Request API
[ ] Card Lifecycle APIs
[ ] Reporting APIs
[ ] Notification APIs

## UI

[x] Design System
[x] Navigation
[x] Screen Registry
[x] Branch UI
[x] Card Programme UI
[x] Card Segment UI
[x] Card Segment Programme UI
[ ] Approval Policy UI
[ ] Request UI
[ ] Card Lifecycle UI
[ ] Dashboard UI

## Testing

[x] Maker / Checker Tests
[x] Approval Policy Tests
[x] Branch Tests
[x] Card Programme Tests
[x] Card Segment Tests
[ ] API Integration Tests
[ ] UI Tests
[ ] End-to-End Tests
[ ] Performance Tests

## Deployment

[ ] Production Configuration
[ ] Logging
[ ] Monitoring
[ ] Backup Strategy
[ ] Deployment Scripts
[ ] Release v1.0

## Future Phases / Backlog

### Cross-Cutting UI Capabilities

#### Grid Export — CSV

**Status:** Planned  
**Priority:** Medium

Every applicable Master/List grid should provide a consistent
"Export CSV" action, following the legacy application's behavior.

Initial scope:

- Card Segments Master
- Card Programmes Master
- Maker-Checker Approval Queue
- Other applicable configuration and transaction grids

Requirements:

- Consistent "Export CSV" action across grids
- Export respects the currently applied filters/search criteria
- Export uses user-visible column names
- Do not expose fields hidden for security reasons
- Consider server-side export for large datasets

**Implementation:** Future phase.

### Operational UX

#### Master Grid ↔ Maker / Checker Correlation

**Status:** Planned  
**Priority:** Medium

Master grids should clearly expose the associated Maker / Checker
Work Item ID for records with pending governance actions.

Example:

    Status: PENDING
    Work Item: MC-00000033

The Maker / Checker Approval Queue should expose the corresponding
Target Entity Type and Target Entity ID.

#### Master Grid → Maker / Checker Review

**Status:** Planned  
**Priority:** Medium

For records with pending Maker / Checker actions, provide a
"Review" action that navigates directly to the corresponding
Maker / Checker work item.

The Approval Queue should be able to focus/highlight the target
work item when navigated to from a Master grid.

The Approval Queue remains the authoritative location for
Approve / Reject actions.

#### Master Grid Status Filtering

**Status:** Planned  
**Priority:** Medium

Review default filtering for Master screens.

Preferred default:

    Status: Active

Pending changes must remain clearly visible and filterable so that
users can distinguish the current effective state from a pending
Maker / Checker change.