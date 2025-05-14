from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.routers import chat
from src.routers import sheets

app = FastAPI(title="Palladium Chat Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(sheets.router)
# app.include_router(jira.router)

@app.get("/")
def root():
    return {"status": "ok"}
