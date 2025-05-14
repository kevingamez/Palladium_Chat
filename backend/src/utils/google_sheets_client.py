import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

class GoogleSheetsClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GoogleSheetsClient, cls).__new__(cls)
            # Cargar credenciales desde archivo JSON o variables de entorno
            credentials_path = os.getenv("GOOGLE_CREDENTIALS_PATH")

            if credentials_path and os.path.exists(credentials_path):
                # Usar archivo de credenciales
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=['https://www.googleapis.com/auth/spreadsheets', 
                           'https://www.googleapis.com/auth/drive']
                )
            else:
                # Alternativa: usar credenciales en formato JSON desde variable de entorno
                credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
                if credentials_json:
                    try:
                        credentials_info = json.loads(credentials_json)  # Usar json.loads en lugar de eval
                        credentials = service_account.Credentials.from_service_account_info(
                            credentials_info,
                            scopes=['https://www.googleapis.com/auth/spreadsheets',
                                  'https://www.googleapis.com/auth/drive']
                        )
                    except json.JSONDecodeError:
                        raise ValueError("GOOGLE_CREDENTIALS_JSON environment variable is not valid JSON")
                else:
                    raise ValueError("No Google credentials found. Set either GOOGLE_CREDENTIALS_PATH or GOOGLE_CREDENTIALS_JSON")
            
            cls._instance.sheets = build('sheets', 'v4', credentials=credentials)
            cls._instance.drive = build('drive', 'v3', credentials=credentials)
        return cls._instance
    
    def create_sheet(self, title, headers):
        """Create a new Google Sheet with specified headers"""
        # Create a new spreadsheet
        spreadsheet = self.sheets.spreadsheets().create(body={
            'properties': {'title': title},
            'sheets': [{'properties': {'title': 'Vendor Inventory'}}]
        }).execute()
        
        spreadsheet_id = spreadsheet['spreadsheetId']
        
        # Add headers
        self.sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range='Vendor Inventory!A1',
            valueInputOption='RAW',
            body={'values': [headers]}
        ).execute()
        
        # Format headers (make bold)
        self.sheets.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={
                'requests': [
                    {
                        'repeatCell': {
                            'range': {'sheetId': 0, 'startRowIndex': 0, 'endRowIndex': 1},
                            'cell': {
                                'userEnteredFormat': {
                                    'textFormat': {'bold': True},
                                    'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}
                                }
                            },
                            'fields': 'userEnteredFormat(textFormat,backgroundColor)'
                        }
                    }
                ]
            }
        ).execute()
        
        # Make the spreadsheet accessible via link
        self.drive.permissions().create(
            fileId=spreadsheet_id,
            body={'type': 'anyone', 'role': 'reader'},
            fields='id'
        ).execute()
        
        # Get share link
        sheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"
        
        return {
            'spreadsheet_id': spreadsheet_id,
            'url': sheet_url
        }

# Singleton instance getter
def get_sheets_client():
    return GoogleSheetsClient()