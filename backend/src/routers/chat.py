from __future__ import annotations
from typing import Dict, List, Any
import os
import shutil
import asyncio
import json
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from src.utils.openai_client import create_conversation, OpenAIConversation
from src.schemas.chat import ChatRequest
from dotenv import load_dotenv
from src.utils.google_sheets_client import get_sheets_client
import PyPDF2

load_dotenv()

router = APIRouter(prefix="/chat", tags=["OpenAI Chat"])

_CONVERSATIONS: Dict[str, OpenAIConversation] = {}

# Define the function specifications for OpenAI function calling
SHEETS_FUNCTIONS = [
    {
        "name": "create_spreadsheet",
        "description": "Create a new Google Sheets spreadsheet with specified title and headers",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Title for the new spreadsheet"
                },
                "headers": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Column headers for the spreadsheet"
                }
            },
            "required": ["title", "headers"]
        }
    },
    {
        "name": "add_row",
        "description": "Add a new row to an existing spreadsheet",
        "parameters": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {
                    "type": "string",
                    "description": "ID of the Google spreadsheet"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Name of the sheet to modify",
                    "default": "Sheet1"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Values to add as a new row"
                }
            },
            "required": ["spreadsheet_id", "values"]
        }
    },
    {
        "name": "update_row",
        "description": "Update values in a specific row of a spreadsheet",
        "parameters": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {
                    "type": "string",
                    "description": "ID of the Google spreadsheet"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Name of the sheet to modify",
                    "default": "Sheet1"
                },
                "row_index": {
                    "type": "integer",
                    "description": "Index of the row to update (1-based)"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "New values for the row"
                }
            },
            "required": ["spreadsheet_id", "row_index", "values"]
        }
    },
    {
        "name": "add_column",
        "description": "Add a new column to an existing spreadsheet",
        "parameters": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {
                    "type": "string",
                    "description": "ID of the Google spreadsheet"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Name of the sheet to modify",
                    "default": "Sheet1"
                },
                "column_name": {
                    "type": "string",
                    "description": "Name for the new column header"
                }
            },
            "required": ["spreadsheet_id", "column_name"]
        }
    },
    {
        "name": "get_spreadsheet_link",
        "description": "Get a link to the current spreadsheet",
        "parameters": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {
                    "type": "string",
                    "description": "ID of the Google spreadsheet"
                }
            },
            "required": ["spreadsheet_id"]
        }
    }
]

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

    # Provide context about sheets before generating a response
    await fetch_sheets_info(req.conversation_id)

    initial_system_message = """
    You can create or modify Google Sheets by using the available functions.

    For spreadsheet operations, use the appropriate function rather than describing the action in text.
    When a user needs a spreadsheet, create one with appropriate headers based on their requirements.
    """

    conversation.add_message("system", initial_system_message)
    conversation.add_message("user", req.content)

    try:
        stream_coroutine = conversation.client.chat.completions.create(
            model=conversation.model,
            messages=[{"role": m["role"], "content": m["content"]} for m in conversation.message_history],
            functions=SHEETS_FUNCTIONS,  # Use 'functions' not 'tools'
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    async def event_generator():
        assistant_content = ""
        function_call_data = {}
        current_function = None

        stream = await stream_coroutine

        async for chunk in stream:
            delta = chunk.choices[0].delta

            # Handle function calling chunks
            if delta.get("function_call"):
                fc = delta.function_call

                # Start of a new function call
                if hasattr(fc, "name") and fc.name:
                    current_function = fc.name
                    function_call_data = {"name": current_function, "arguments": ""}

                # Accumulate function arguments
                if hasattr(fc, "arguments") and fc.arguments:
                    function_call_data["arguments"] += fc.arguments

            # Handle normal content
            elif delta.get("content") is not None:
                token = delta.content
                assistant_content += token
                yield f"data: {token}\n\n"

            # End of function call - process it
            if chunk.choices[0].finish_reason == "function_call":
                raw_args = function_call_data["arguments"]
                print("RAW ARGS JSON:", raw_args)  # Debug log
                try:
                    # Just validate JSON but use the raw string for the function call
                    json.loads(raw_args)
                    result = await process_function_call(
                        function_call_data["name"],
                        raw_args,
                        req.conversation_id
                    )

                    # Send function result to the user
                    if result:
                        yield f"data: {result}\n\n"
                        assistant_content += result
                except json.JSONDecodeError as e:
                    error_msg = f"Error parsing JSON args: {str(e)} in {raw_args}"
                    print(error_msg)  # Log the error
                    yield f"data: {error_msg}\n\n"
                except Exception as e:
                    error_msg = f"Error executing function: {str(e)}"
                    print(error_msg)  # Log the error
                    yield f"data: {error_msg}\n\n"

        conversation.add_message("assistant", assistant_content)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

async def process_function_call(function_name: str, arguments_json: str, conversation_id: str) -> str:
    """Process function calls from OpenAI and execute the appropriate actions"""
    try:
        # Print for debugging
        print(f"Processing function: {function_name}")
        print(f"Arguments JSON: {arguments_json}")

        # Parse JSON arguments
        args = json.loads(arguments_json)

        client = get_sheets_client()
        conversation = _CONVERSATIONS.get(conversation_id)

        if function_name == "create_spreadsheet":
            title = args.get("title", "Vendor Inventory")
            headers = args.get("headers", ["Vendor Name", "Services Provided", "Contract Terms",
                               "Compliance Info", "Usage Criticality", "Status"])

            result = client.create_sheet(title, headers)

            if conversation:
                if not hasattr(conversation, 'metadata'):
                    conversation.metadata = {}
                conversation.metadata['spreadsheet_id'] = result['spreadsheet_id']

            return f"I've created a {title} spreadsheet with all the columns you need. You can access it here: {result['url']}"

        elif function_name == "add_row":
            spreadsheet_id = args.get("spreadsheet_id")
            sheet_name = args.get("sheet_name", "Sheet1")
            values = args.get("values", [])

            result = client.add_row(spreadsheet_id, sheet_name, values)

            if result and result.get('success', False):
                return f"I've added a new row to your spreadsheet with the values you provided."
            else:
                return "I couldn't add a row to the spreadsheet. Please check the parameters and try again."

        elif function_name == "update_row":
            spreadsheet_id = args.get("spreadsheet_id")
            sheet_name = args.get("sheet_name", "Sheet1")
            row_index = args.get("row_index")
            values = args.get("values", [])

            result = client.update_row(spreadsheet_id, sheet_name, row_index, values)

            if result and result.get('success', False):
                return f"I've updated row {row_index} in your spreadsheet with the new values."
            else:
                return "I couldn't update the spreadsheet row. Please check the parameters and try again."

        elif function_name == "add_column":
            spreadsheet_id = args.get("spreadsheet_id")
            sheet_name = args.get("sheet_name", "Sheet1")
            column_name = args.get("column_name")

            result = client.add_column(spreadsheet_id, sheet_name, column_name)

            if result and result.get('success', False):
                return f"I've added a new column '{column_name}' to your spreadsheet."
            else:
                return "I couldn't add a column to the spreadsheet. Please check the parameters and try again."

        elif function_name == "get_spreadsheet_link":
            spreadsheet_id = args.get("spreadsheet_id")
            sheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"
            return f"Here's the link to your spreadsheet: {sheet_url}"

        return "The requested function is not supported."

    except Exception as e:
        print(f"Function error: {str(e)}")
        return f"Error processing function call: {str(e)}"

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
            messages=[{"role": m["role"], "content": m["content"]} for m in conversation.message_history],
            functions=SHEETS_FUNCTIONS,  # Use 'functions' not 'tools'
            stream=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    async def event_generator():
        assistant_content = ""
        function_call_data = {}
        current_function = None

        stream = await stream_coroutine

        async for chunk in stream:
            delta = chunk.choices[0].delta

            # Handle function calling chunks
            if delta.get("function_call"):
                fc = delta.function_call

                # Start of a new function call
                if hasattr(fc, "name") and fc.name:
                    current_function = fc.name
                    function_call_data = {"name": current_function, "arguments": ""}

                # Accumulate function arguments
                if hasattr(fc, "arguments") and fc.arguments:
                    function_call_data["arguments"] += fc.arguments

            # Handle normal content
            elif delta.get("content") is not None:
                token = delta.content
                assistant_content += token
                yield f"data: {token}\n\n"

            # End of function call - process it
            if chunk.choices[0].finish_reason == "function_call":
                raw_args = function_call_data["arguments"]
                print("RAW ARGS JSON:", raw_args)  # Debug log
                try:
                    # Validate JSON but use the raw string for processing
                    json.loads(raw_args)
                    result = await process_function_call(
                        function_call_data["name"],
                        raw_args,
                        req.conversation_id
                    )

                    # Send function result to the user
                    if result:
                        yield f"data: {result}\n\n"
                        assistant_content += result
                except json.JSONDecodeError as e:
                    error_msg = f"Error parsing JSON args: {str(e)} in {raw_args}"
                    print(error_msg)  # Log the error
                    yield f"data: {error_msg}\n\n"
                except Exception as e:
                    error_msg = f"Error executing function: {str(e)}"
                    print(error_msg)  # Log the error
                    yield f"data: {error_msg}\n\n"

        conversation.add_message("assistant", assistant_content)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

def extract_text_from_pdf(file_path):
    with open(file_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

async def fetch_sheets_info(conversation_id):
    """Gets information about sheets associated with this conversation"""
    if conversation_id in _CONVERSATIONS:
        conversation = _CONVERSATIONS[conversation_id]

        # If there's a spreadsheet_id in the metadata
        if hasattr(conversation, 'metadata') and 'spreadsheet_id' in conversation.metadata:
            sheet_id = conversation.metadata['spreadsheet_id']
            sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

            # Add this information as context
            context_message = f"Current spreadsheet: {sheet_url}"
            conversation.add_message("system", context_message)
            return True

    return False