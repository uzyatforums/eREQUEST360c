Configuration Framework

- Move transaction ownership entirely into ConfigurationOrchestrator.
- Remove db.commit() from ApprovalPolicyService.
- Add unique constraint:
  (client_id, entity_type_code, operation_code)
- Add inactive-policy unit test.
- Improve structured logging.
- Replace legacy entity_id=0 sentinel with nullable entity_key VARCHAR(64) (Optional[str] = None in schemas) for uncreated CREATE proposals per Accepted ADR-008 (application alignment implemented; schema pending Migration 022 execution).
- Redesign work_item_number so that it is not derived from the grandfathered sequential work_items.id.