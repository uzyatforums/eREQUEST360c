import json
import jwt
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.config import settings
from src.db_models import AuditEventType, AuditEvent, AuditEventDetail, AuditSnapshot, ApiLogRequestResponse


def save_api_log(log_data: dict):
    db = SessionLocal()
    try:
        log_entry = ApiLogRequestResponse(
            request_path=log_data["request_path"],
            request_method=log_data["request_method"],
            request_headers=log_data["request_headers"],
            request_body=log_data["request_body"],
            response_status_code=log_data["response_status_code"],
            response_body=log_data["response_body"],
            performed_by=log_data["performed_by"],
            client_id=log_data["client_id"],
            created_date=log_data["created_date"]
        )
        db.add(log_entry)
        db.commit()
    except Exception as db_err:
        print(f"[ApiLoggingMiddleware] DB Logging Error: {db_err}")
    finally:
        db.close()


class ApiLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Skip logging for static files, docs, health, or root redirect
        if (
            path.startswith("/static") or 
            path in ["/health", "/", "/docs", "/openapi.json"] or
            path.startswith("/docs")
        ):
            return await call_next(request)

        # Buffer request body safely
        request_body = b""
        async def set_body(req: Request):
            nonlocal request_body
            request_body = await req.body()
            async def receive() -> Message:
                return {"type": "http.request", "body": request_body, "more_body": False}
            req._receive = receive

        await set_body(request)

        # Call next handler
        try:
            response = await call_next(request)
        except Exception as e:
            raise e

        # Extract response body safely without consuming the stream permanently
        response_body = b""
        response_headers = dict(response.headers)
        try:
            response_body = await response.body()
            response = Response(
                content=response_body,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.media_type
            )
        except Exception:
            pass

        # Prepare API Log Entry data
        username = None
        client_id = None
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.database_url, algorithms=["HS256"])
                username = payload.get("sub")
                client_id = payload.get("client_id")
            except Exception:
                pass

        log_data = {
            "request_path": path,
            "request_method": request.method,
            "request_headers": str(dict(request.headers)),
            "request_body": request_body.decode("utf-8", errors="ignore"),
            "response_status_code": response.status_code,
            "response_body": response_body.decode("utf-8", errors="ignore"),
            "performed_by": username,
            "client_id": client_id,
            "created_date": datetime.now(timezone.utc)
        }

        # Save API Log Entry to DB as a background task to prevent SQLite database locking
        existing_background = response.background
        def combined_background():
            save_api_log(log_data)
            if existing_background:
                existing_background()

        response.background = BackgroundTask(combined_background)
        return response


def log_audit_event(
    db: Session,
    entity_type: str,
    entity_id: int,
    event_code: str,
    performed_by: str,
    branch_code: Optional[str] = None,
    remarks: Optional[str] = None,
    correlation_id: Optional[str] = None,
    snapshot_data: Optional[dict] = None,
    changes: Optional[dict] = None  # Formatted as: {column_name: (old_value, new_value)}
):
    try:
        # 1. Resolve or create event_type_id dynamically
        # To avoid integer collisions, we hash the event_code and use a positive int.
        event_type = db.query(AuditEventType).filter(AuditEventType.event_code == event_code).first()
        if not event_type:
            event_type_id = abs(hash(event_code)) % 2147483647
            event_type = AuditEventType(
                event_type_id=event_type_id,
                event_code=event_code,
                description=f"Auto-generated type for {event_code}"
            )
            db.add(event_type)
            db.flush()

        # 2. Insert record into audit_events
        event = AuditEvent(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type_id=event_type.event_type_id,
            event_source="API",
            performed_by=performed_by,
            branch_code=branch_code[:3] if branch_code else None,  # DB column length is VARCHAR(3)
            event_time=datetime.now(timezone.utc),
            correlation_id=correlation_id,
            remarks=remarks
        )
        db.add(event)
        db.flush()

        # 3. Create AuditEventDetails if changes are provided
        if changes:
            for col, values in changes.items():
                old_val, new_val = values
                detail = AuditEventDetail(
                    event_id=event.event_id,
                    column_name=col,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val) if new_val is not None else None
                )
                db.add(detail)

        # 4. Create AuditSnapshot if snapshot_data is provided
        if snapshot_data:
            snapshot = AuditSnapshot(
                entity_type=entity_type,
                entity_id=entity_id,
                snapshot_data=json.dumps(snapshot_data),
                event_id=event.event_id,
                snapshot_time=datetime.now(timezone.utc)
            )
            db.add(snapshot)
            
        db.commit()
    except Exception as exc:
        print(f"[log_audit_event] Failed to log audit event: {exc}")
        # Re-raise so that errors in audits can be caught or roll back parent transactions
        raise exc
