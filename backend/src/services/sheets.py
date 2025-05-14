from googleapiclient.discovery import build

def get_service(creds):
    return build("sheets", "v4", credentials=creds)

def append_row(spreadsheet_id: str, values: list[str], creds):
    service = get_service(creds)
    body = {"values": [values]}
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range="A1",
        valueInputOption="USER_ENTERED",
        body=body,
    ).execute()
