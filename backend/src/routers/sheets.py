
from fastapi import APIRouter, HTTPException
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