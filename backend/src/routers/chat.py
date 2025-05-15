from __future__ import annotations
from typing import Dict, List
import os
import shutil
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from src.utils.openai_client import create_conversation, OpenAIConversation
from src.schemas.chat import ChatRequest
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chat", tags=["OpenAI Chat"])

_CONVERSATIONS: Dict[str, OpenAIConversation] = {}


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    if req.conversation_id not in _CONVERSATIONS:
        _CONVERSATIONS[req.conversation_id] = create_conversation(req.conversation_id)

    conversation = _CONVERSATIONS[req.conversation_id]

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
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            assistant_content += token
            yield f"data: {token}\n\n"

        conversation.add_message("assistant", assistant_content)

    return StreamingResponse(event_generator(),
                             media_type="text/event-stream")

# Add a new endpoint for file uploads
@router.post("/upload")
async def upload_files(
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    # Create upload directory if it doesn't exist
    upload_dir = os.path.join("uploads", conversation_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_paths = []
    for file in files:
        # Save file to disk
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_paths.append(file_path)

    # Add file references to conversation history
    if conversation_id in _CONVERSATIONS:
        conversation = _CONVERSATIONS[conversation_id]
        file_names = [file.filename for file in files]
        # Add system message noting file uploads
        conversation.add_message(
            "system",
            f"User uploaded files: {', '.join(file_names)}"
        )

    return {"uploaded_files": [file.filename for file in files]}

# Modify your chat endpoint to handle files
@router.post("/stream-with-files")
async def chat_stream_with_files(req: ChatRequest):
    """Chat with file context if files have been uploaded"""
    if req.conversation_id not in _CONVERSATIONS:
        _CONVERSATIONS[req.conversation_id] = create_conversation(req.conversation_id)

    conversation = _CONVERSATIONS[req.conversation_id]
    conversation.add_message("user", req.content)

    # Check for uploaded files
    upload_dir = os.path.join("uploads", req.conversation_id)
    file_contents = []

    if os.path.exists(upload_dir):
        files = os.listdir(upload_dir)
        for file in files:
            file_path = os.path.join(upload_dir, file)
            # For simplicity, assuming text files - in production,
            # you'd need to handle different file types
            try:
                with open(file_path, "r") as f:
                    content = f.read()
                    file_contents.append(f"Content of {file}:\n{content}")
            except:
                # For binary files, just mention they exist
                file_contents.append(f"File uploaded: {file}")

    # Add file contents as context if available
    if file_contents:
        file_context = "\n\n".join(file_contents)
        context_message = f"The user has uploaded the following files:\n{file_context}"
        # Two options:
        # 1. Add as system message to conversation
        conversation.add_message("system", context_message)
        # OR 2. Append to the latest user message (if files are directly related)
        # conversation.message_history[-1]["content"] += f"\n\n{context_message}"

    # Rest of your code for streaming the response remains the same...
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
