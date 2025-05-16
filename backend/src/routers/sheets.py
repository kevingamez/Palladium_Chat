from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from src.models.chat import Chat
from src.db import get_session
from src.services.google_sheets import create_vendor_sheet
from pydantic import BaseModel
from typing import List, Optional, Any
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

class RowUpdateRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Sheet1"
    row_index: Optional[int] = None  # Si es None, añade una nueva fila
    values: List[Any]

class ColumnAddRequest(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Sheet1"
    column_name: str

@router.post("/rows/add")
async def add_row(request: RowUpdateRequest):
    try:
        client = get_sheets_client()
        result = client.add_row(
            request.spreadsheet_id,
            request.sheet_name,
            request.values
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rows/update")
async def update_row(request: RowUpdateRequest):
    if request.row_index is None:
        raise HTTPException(status_code=400, detail="Row index is required for updates")

    try:
        client = get_sheets_client()
        result = client.update_row(
            request.spreadsheet_id,
            request.sheet_name,
            request.row_index,
            request.values
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/columns/add")
async def add_column(request: ColumnAddRequest):
    try:
        client = get_sheets_client()
        result = client.add_column(
            request.spreadsheet_id,
            request.sheet_name,
            request.column_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))