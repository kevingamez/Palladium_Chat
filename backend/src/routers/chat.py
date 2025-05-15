from __future__ import annotations
from typing import Dict, List
import os
import shutil
import asyncio
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from src.utils.openai_client import create_conversation, OpenAIConversation
from src.schemas.chat import ChatRequest
from dotenv import load_dotenv
from src.utils.google_sheets_client import get_sheets_client
import re
import PyPDF2
import io

load_dotenv()

router = APIRouter(prefix="/chat", tags=["OpenAI Chat"])

_CONVERSATIONS: Dict[str, OpenAIConversation] = {}


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    if req.conversation_id not in _CONVERSATIONS:
        _CONVERSATIONS[req.conversation_id] = create_conversation(req.conversation_id)

        try:
            client = get_sheets_client()
            tracker_data = client.read_integration_tracker()

            system_message = "Información del proyecto de integración:\n\n"

            for item in tracker_data:
                if all(key in item for key in ["Integration Area", "Completion Status", "% Complete"]):
                    system_message += f"- {item['Integration Area']}: {item['Completion Status']} ({item['% Complete']}% completado)\n"

            _CONVERSATIONS[req.conversation_id].add_message("system", system_message)

        except Exception as e:
            print(f"Error al cargar datos iniciales: {str(e)}")

    conversation = _CONVERSATIONS[req.conversation_id]

    initial_system_message = """
    When you need to create a spreadsheet, include the following structure in your response:

    [ACTION] Create a spreadsheet
    Title: [suggested name for the sheet]
    Headers: [list of suggested headers]
    [/ACTION]

    For example:

    [ACTION] Create a spreadsheet
    Title: Vendor Consolidation Tracker
    Headers:
    - Vendor Name
    - Services Provided
    - Contract Terms
    - Compliance Info
    - Usage Criticality
    - Status
    [/ACTION]

    I will handle creating the sheet and provide you with the link.
    """

    conversation.add_message("system", initial_system_message)

    conversation.add_message("user", req.content)

    try:
        stream_coroutine = conversation.client.chat.completions.create(
            model=conversation.model,
            messages=[{"role": m["role"], "content": m["content"]}
                      for m in conversation.message_history],
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    async def event_generator():
        assistant_content = ""
        stream = await stream_coroutine
        action_mode = False
        action_content = ""
        buffer = ""

        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            assistant_content += token

            if not action_mode and "[ACTION]" in (buffer + token):
                action_mode = True
                action_content = ""
                buffer = ""
                continue

            if action_mode:
                action_content += token

                if "[/ACTION]" in action_content:
                    action_content = action_content.split("[/ACTION]")[0]

                    result = await process_sheet_creation_sync(action_content, req.conversation_id)

                    natural_response = f"I've created a spreadsheet with all the columns you requested. You can access it here: {result['url']}"
                    yield f"data: {natural_response}\n\n"

                    action_mode = False

                continue

            buffer += token
            if len(buffer) > 8:
                yield f"data: {buffer[0]}\n\n"
                buffer = buffer[1:]

        if buffer and not action_mode:
            yield f"data: {buffer}\n\n"

        final_content = assistant_content
        if "[ACTION]" in assistant_content and "[/ACTION]" in assistant_content:
            parts = assistant_content.split("[ACTION]")
            post_parts = parts[1].split("[/ACTION]")
            final_content = parts[0] + natural_response + (post_parts[1] if len(post_parts) > 1 else "")

        conversation.add_message("assistant", final_content)

    return StreamingResponse(event_generator(),
                             media_type="text/event-stream")

@router.post("/upload")
async def upload_files(
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    upload_dir = os.path.join("uploads", conversation_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_paths = []
    for file in files:
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_paths.append(file_path)

    if conversation_id in _CONVERSATIONS:
        conversation = _CONVERSATIONS[conversation_id]
        file_names = [file.filename for file in files]
        conversation.add_message(
            "system",
            f"User uploaded files: {', '.join(file_names)}"
        )

    return {"uploaded_files": [file.filename for file in files]}

@router.post("/stream-with-files")
async def chat_stream_with_files(req: ChatRequest):
    """Chat with file context if files have been uploaded"""
    if req.conversation_id not in _CONVERSATIONS:
        _CONVERSATIONS[req.conversation_id] = create_conversation(req.conversation_id)

    conversation = _CONVERSATIONS[req.conversation_id]
    conversation.add_message("user", req.content)

    upload_dir = os.path.join("uploads", req.conversation_id)
    file_contents = []

    if os.path.exists(upload_dir):
        files = os.listdir(upload_dir)
        for file in files:
            file_path = os.path.join(upload_dir, file)

            if file.lower().endswith('.pdf'):
                try:
                    text = extract_text_from_pdf(file_path)
                    file_contents.append(f"Content of {file}:\n{text}")
                except Exception as e:
                    file_contents.append(f"Error extracting text from PDF {file}: {str(e)}")
            else:
                try:
                    with open(file_path, "r") as f:
                        content = f.read()
                        file_contents.append(f"Content of {file}:\n{content}")
                except:
                    file_contents.append(f"File uploaded: {file}")

    if file_contents:
        file_context = "\n\n".join(file_contents)
        context_message = f"The user has uploaded the following files:\n{file_context}"
        conversation.add_message("system", context_message)


    try:
        stream_coroutine = conversation.client.chat.completions.create(
            model=conversation.model,
            messages=[{"role": m["role"], "content": m["content"]}
                     for m in conversation.message_history],
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    async def event_generator():
        assistant_content = ""
        stream = await stream_coroutine
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            assistant_content += token
            yield f"data: {token}\n\n"

        conversation.add_message("assistant", assistant_content)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

async def process_sheet_creation(content, conversation_id, conversation):
    try:

        title_match = re.search(r'title[:\s]+["\'"]?(.*?)["\'"]?[\s\n]', content, re.IGNORECASE)
        title = title_match.group(1) if title_match else "Vendor Inventory"

        headers_section = re.search(r'headers?[:\s]+(.*?)(?:\n\n|\[\/ACTION\]|$)', content, re.IGNORECASE | re.DOTALL)

        if headers_section:
            headers_text = headers_section.group(1)
            headers = re.findall(r'-\s+(.*?)(?:\n|$)', headers_text)

            if not headers:
                headers = [h.strip() for h in re.split(r'[,\n]', headers_text) if h.strip()]
        else:
            headers = ["Vendor Name", "Services Provided", "Contract Terms",
                      "Compliance Info", "Usage Criticality", "Status"]

        client = get_sheets_client()
        result = client.create_sheet(title, headers)

        natural_response = f"I've created a {title} spreadsheet with all the columns you need. You can access it here: {result['url']}"

        conversation.add_message("assistant", natural_response)

    except Exception as e:
        error_message = f"I couldn't create the spreadsheet: {str(e)}"
        conversation.add_message("assistant", error_message)

async def process_sheet_creation_sync(content, conversation_id):


    title_match = re.search(r'title[:\s]+["\'"]?(.*?)["\'"]?[\s\n]', content, re.IGNORECASE)
    title = title_match.group(1) if title_match else "Vendor Inventory"

    headers_section = re.search(r'headers?[:\s]+(.*?)(?:\n\n|\[\/ACTION\]|$)', content, re.IGNORECASE | re.DOTALL)

    if headers_section:
        headers_text = headers_section.group(1)
        headers = re.findall(r'-\s+(.*?)(?:\n|$)', headers_text)
        if not headers:
            headers = [h.strip() for h in re.split(r'[,\n]', headers_text) if h.strip()]
    else:
        headers = ["Vendor Name", "Services Provided", "Contract Terms",
                 "Compliance Info", "Usage Criticality", "Status"]

    client = get_sheets_client()
    result = client.create_sheet(title, headers)

    if conversation_id in _CONVERSATIONS:
        conversation = _CONVERSATIONS[conversation_id]
        if not hasattr(conversation, 'metadata'):
            conversation.metadata = {}
        conversation.metadata['spreadsheet_id'] = result['spreadsheet_id']

    return result

def extract_text_from_pdf(file_path):
    with open(file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
