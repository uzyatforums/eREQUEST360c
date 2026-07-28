Configuration Framework

- Move transaction ownership entirely into ConfigurationOrchestrator.
- Remove db.commit() from ApprovalPolicyService.
- Add unique constraint:
  (client_id, entity_type_code, operation_code)
- Add inactive-policy unit test.
- Improve structured logging.
- Replace entity_id=0 with Optional[int] where appropriate.