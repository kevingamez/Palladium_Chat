from google.oauth2 import service_account
from googleapiclient.discovery import build
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
CREDS_FILE = Path(__file__).parent.parent / "service-account.json"

def get_sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        CREDS_FILE, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds, cache_discovery=False)

def create_vendor_sheet(title: str = "Vendor Inventory"):
    service = get_sheets_service()
    spreadsheet = (
        service.spreadsheets()
        .create(body={"properties": {"title": title}})
        .execute()
    )
    sheet_id = spreadsheet["spreadsheetId"]
    # Escribe cabeceras
    headers = [
        ["Vendor Name", "Services Provided", "Contract Terms",
         "Compliance Info", "Usage Criticality"]
    ]
    (
        service.spreadsheets()
        .values()
        .update(
            spreadsheetId=sheet_id,
            range="A1:E1",
            valueInputOption="RAW",
            body={"values": headers},
        )
        .execute()
    )
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
    return sheet_id, url