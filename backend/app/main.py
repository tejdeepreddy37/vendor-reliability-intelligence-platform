from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# IMPORTANT
import app.models

from app.routers.auth import router as auth_router
from app.routers.vendor import router as vendor_router
from app.routers.procurement import router as procurement_router
from app.routers.purchase_order import router as purchase_order_router
from app.routers.contract import router as contract_router
from app.routers.communication import router as communication_router
from app.routers.risk import router as risk_router
from app.routers.vendor_performance import router as vendor_performance_router
from app.routers.reliability import router as reliability_router
from app.routers.report import router as report_router
from app.routers.notifications import router as notifications_router
from app.routers.dashboard import router as dashboard_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
)

# ----------------------------------------------------
# CORS
# ----------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# CREATE TABLES
# ----------------------------------------------------

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# ----------------------------------------------------
# ROUTERS
# ----------------------------------------------------

app.include_router(auth_router)
app.include_router(vendor_router)
app.include_router(procurement_router)
app.include_router(purchase_order_router)
app.include_router(contract_router)
app.include_router(communication_router)
app.include_router(risk_router)
app.include_router(vendor_performance_router)
app.include_router(reliability_router)
app.include_router(report_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)

# ----------------------------------------------------
# HOME
# ----------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Vendor Reliability Intelligence Platform API is Running Successfully"
    }