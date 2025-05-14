from pydantic import BaseModel

class ChatRequest(BaseModel):
    conversation_id: str           # lo envía el FE (por ej. UUID)
    content: str