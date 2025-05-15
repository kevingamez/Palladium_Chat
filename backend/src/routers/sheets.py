from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from src.models.chat import Chat
from src.db import get_session
from src.services.google_sheets import create_vendor_sheet
from pydantic import BaseModel
from typing import List
from src.utils.google_sheets_client import get_sheets_client

router = APIRouter(prefix="/sheets", tags=["Google Sheets"])

class SheetCreateRequest(BaseModel):
    title: str
    headers: List[str]
    conversation_id: str

@router.post("/create")
async def create_sheet(request: SheetCreateRequest):
    try:
        client = get_sheets_client()
        result = client.create_sheet(request.title, request.headers)

        from src.routers.chat import _CONVERSATIONS
        
        if request.conversation_id in _CONVERSATIONS:
            conversation = _CONVERSATIONS[request.conversation_id]
            if not hasattr(conversation, 'metadata'):
                conversation.metadata = {}
            conversation.metadata['spreadsheet_id'] = result['spreadsheet_id']
            
            conversation.add_message(
                "system", 
                f"Created spreadsheet: {result['url']}"
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CreateSheetOut(BaseModel):
    spreadsheet_id: str
    url: str

@router.post("/chats/{chat_id}/actions/create_sheet", response_model=CreateSheetOut)
def action_create_sheet(chat_id: str, session: Session = Depends(get_session)):
    chat = session.exec(select(Chat).where(Chat.id == chat_id)).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Solo creamos una vez por chat
    if chat.spreadsheet_id:
        return {
            "spreadsheet_id": chat.spreadsheet_id,
            "url": f"https://docs.google.com/spreadsheets/d/{chat.spreadsheet_id}",
        }

    sheet_id, url = create_vendor_sheet()
    chat.spreadsheet_id = sheet_id
    session.add(chat)
    session.commit()

    return {"spreadsheet_id": sheet_id, "url": url}

@router.get("/integration-tracker")
async def get_integration_tracker():
    try:
        client = get_sheets_client()
        tracker_data = client.read_integration_tracker()

        return {
            "success": True,
            "data": tracker_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))