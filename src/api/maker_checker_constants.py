from typing import Set, Dict, Any, Optional


class WorkItemStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class WorkItemOperation:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    CANCEL = "CANCEL"
    RESUBMIT = "RESUBMIT"


IGNORED_CHANGE_SUMMARY_FIELDS: Set[str] = {
    "created_by",
    "created_date",
    "last_modified_by",
    "last_modified_date",
    "id",
    "client_id",
    "active",
}


TRANSITION_MAP: Dict[str, Dict[str, Any]] = {
    WorkItemOperation.APPROVE: {
        "allowed_from": {WorkItemStatus.PENDING},
        "target_status": WorkItemStatus.APPROVED,
        "maker_permitted": False,
        "date_field": "approved_date",
        "checker_field": "checker_user_id",
    },
    WorkItemOperation.REJECT: {
        "allowed_from": {WorkItemStatus.PENDING},
        "target_status": WorkItemStatus.REJECTED,
        "maker_permitted": False,
        "date_field": "rejected_date",
        "checker_field": "checker_user_id",
    },
    WorkItemOperation.CANCEL: {
        "allowed_from": {WorkItemStatus.PENDING},
        "target_status": WorkItemStatus.CANCELLED,
        "maker_permitted": True,
        "date_field": "cancelled_date",
        "checker_field": None,
    },
    WorkItemOperation.RESUBMIT: {
        "allowed_from": {WorkItemStatus.REJECTED},
        "target_status": WorkItemStatus.PENDING,
        "maker_permitted": True,
        "date_field": None,
        "checker_field": None,
    },
}
