from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import models  # noqa: F401
from app.api import auth, admin, orders

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LastMile Delivery Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(orders.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "LastMile API running"}