from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from src.models import HealthCheckResponse
from src.api.requests import router as requests_router
from src.api.auth import router as auth_router, users_router, roles_router
from src.api.config_api import router as config_router
from src.api.eligibility import router as eligibility_router
from src.api.charges import router as charges_router
from src.api.maker_checker import router as maker_checker_router
from src.api.approval_policies import router as approval_policies_router
from src.api.branches import router as branches_router
from src.db import init_db
from src.api.audit_service import ApiLoggingMiddleware

app = FastAPI(
    title="eREQUEST 360",
    description="Core platform APIs for multi-tenant card issuance and lifecycle management.",
    version="0.1.0",
)

app.add_middleware(ApiLoggingMiddleware)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(requests_router)
app.include_router(config_router)
app.include_router(eligibility_router)
app.include_router(charges_router)
app.include_router(maker_checker_router)
app.include_router(approval_policies_router)
app.include_router(branches_router)




# Mount the static folder for the frontend dashboard
app.mount("/static", StaticFiles(directory="src/static"), name="static")

@app.get("/")
def redirect_to_index():
    return RedirectResponse(url="/static/index.html")

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return {"status": "ok", "message": "eREQUEST 360 API is running."}
