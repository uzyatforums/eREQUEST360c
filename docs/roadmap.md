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
[x] Card Charges Headers
[x] Card Charge Entries
[x] Card Segment Programme Charges
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
[x] Work Item ID Display on Master Grids
[x] Master Grid → Maker / Checker Review Navigation
[x] Maker / Checker Target Row Focus / Highlight
[x] Status Filter — Active as Default
[x] Configurable User Inactivity Timeout
[x] Master Grid Bulk-Selection / Row Checkboxes
[x] Segment Programme Charges Menu Indentation
[x] Consistent ACTIONS Button Mouse Cursor
[x] Card Segment Programme Charges Dropdown Filters

### Recent Completed Enhancements

- **Configurable User Inactivity Timeout**: Configurable session idle timeout handling (currently defaults to 5 minutes) with automatic re-authentication prompt.
- **Master Grid Bulk-Selection / Row Checkboxes**: Standardized row-selection framework (`useRowSelection`, header Select All / Deselect All checkbox, `SelectionToolbar`) across Card Programmes Master, Card Segments Master, Card Charges Master, and Card Segment Programme Charges Master.
- **Consistent ACTIONS Button Mouse Cursor**: Enforced interactive pointer cursors (`cursor-pointer`) across all action buttons, table cell triggers, and dropdown controls.
- **Segment Programme Charges Menu Indentation**: Standardized visual hierarchy for child workspace navigation in the sidebar.
- **Card Segment Programme Charges Filtering**: Added dropdown filters for Card Segment, Card Programme, and Assigned Charge Header integrated with server-side query parameters and page reset handling.

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
[x] Card Segment Programme Charges UI
[x] Master Grid Bulk-Selection / Checkboxes
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
[x] Card Segment Programme Charges Tests
[x] Inactivity Timeout Tests
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

**Status:** Implemented — Phase 1
**Priority:** Medium

Master grids now clearly expose the associated Maker / Checker
Work Item ID for records with pending governance actions.

Example:

Status: Pending Approval
Work Item: MC-00000033

The correlation is performed server-side using the existing
Maker / Checker work item relationship:

Target Entity Type + Target Entity ID.

No duplicate persistence or database schema changes were introduced.

Phase 1 enhancements now implemented:

- Master Grid → Maker / Checker Review Navigation
- Maker / Checker Target Row Focus / Highlight

#### Master Grid → Maker / Checker Review

**Status:** Implemented — Phase 1
**Priority:** Medium

For records with pending Maker / Checker actions, provides a
"Review" action that navigates directly to the corresponding
Maker / Checker work item.

The Approval Queue focuses/highlights the target work item when navigated to from a Master grid.

The Approval Queue remains the authoritative location for
Approve / Reject actions.

#### Master Grid Status Filtering

**Status:** Implemented
**Priority:** Medium

Master screens use Active as the default status filter.

Preferred default:


    Status: Active

Pending changes must remain clearly visible and filterable so that
users can distinguish the current effective state from a pending
Maker / Checker change.