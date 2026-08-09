import logging
from abc import ABC, abstractmethod
from typing import Dict, Type, Optional, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import MakerCheckerWorkItem, MakerCheckerWorkItemPayload

logger = logging.getLogger("entity_execution_dispatcher")


class EntityExecutor(ABC):
    @abstractmethod
    def execute(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        payload: Optional[MakerCheckerWorkItemPayload],
        checker_user_id: str,
    ) -> None:
        """
        Applies the approved change payload to the domain database tables.
        Must NOT call db.commit() or db.rollback(). All operations run within
        the caller's active database transaction scope.
        """
        pass


class EntityExecutionDispatcher:
    _executors: Dict[str, EntityExecutor] = {}

    @classmethod
    def register(cls, entity_type_code: str):
        """Decorator to register an EntityExecutor class for a specific entity_type_code."""
        def decorator(executor_cls: Type[EntityExecutor]):
            instance = executor_cls()
            cls._executors[entity_type_code.upper()] = instance
            logger.info(f"[EntityExecutionDispatcher] Registered executor for '{entity_type_code.upper()}' -> {executor_cls.__name__}")
            return executor_cls
        return decorator

    @classmethod
    def register_instance(cls, entity_type_code: str, executor_instance: EntityExecutor):
        cls._executors[entity_type_code.upper()] = executor_instance

    @classmethod
    def dispatch(
        cls,
        db: Session,
        work_item: MakerCheckerWorkItem,
        payload: Optional[MakerCheckerWorkItemPayload],
        checker_user_id: str,
    ) -> None:
        entity_code = work_item.entity_type_code.upper()
        executor = cls._executors.get(entity_code)
        if not executor:
            logger.warning(
                f"[EntityExecutionDispatcher] No executor registered for entity_type='{entity_code}'"
            )
            return

        logger.info(
            f"[EntityExecutionDispatcher] Dispatching work_item #{work_item.id} ({entity_code}, {work_item.operation_code}) "
            f"to {executor.__class__.__name__}"
        )
        executor.execute(db, work_item, payload, checker_user_id)
