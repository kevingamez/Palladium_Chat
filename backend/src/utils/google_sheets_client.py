import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv
from pathlib import Path
load_dotenv()

class GoogleSheetsClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GoogleSheetsClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Inicializar solo si no se ha hecho antes
        if not hasattr(self, 'initialized') or not self.initialized:
            self._initialize_clients()
            self.initialized = True
    SCOPES = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ]
    def _initialize_clients(self):
        """Inicializa los clientes de Google API"""
        try:
            # Cargar credenciales desde archivo JSON o variables de entorno
            credentials_path = './src/credentials.json'
            print(f"Verificando ruta de credenciales: {credentials_path}")

            if credentials_path and Path(credentials_path).exists():
                print(f"Usando archivo de credenciales: {credentials_path}")
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=self.SCOPES,
                )
            else:
                raise RuntimeError(
                    "No Google credentials found. "
                    "Set GOOGLE_CREDENTIALS_PATH or GOOGLE_CREDENTIALS_JSON"
                )

            self.sheets = build('sheets', 'v4', credentials=credentials, cache_discovery=False)
            self.drive = build('drive', 'v3', credentials=credentials, cache_discovery=False)

            print("Inicializando cliente de Google Sheets...")
            self.sheets = build('sheets', 'v4', credentials=credentials)
            print("Inicializando cliente de Google Drive...")
            self.drive = build('drive', 'v3', credentials=credentials)
            print("Inicialización completada con éxito")
        except Exception as e:
            import traceback
            print(f"Error al inicializar GoogleSheetsClient: {str(e)}")
            traceback.print_exc()
            self.initialized = False
            raise
    
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
        
        # Skip formatting for now
        
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

    def read_integration_tracker(self, spreadsheet_id="1Vil2a5Z2vAjP3OawRkGfZ3O8JQA4oFsXvzdzu_B0g9U"):
        """Leer los datos del Integration Tracker"""
        try:
            result = self.sheets.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range="A1:I15",  # Ajusta el rango según tus necesidades
            ).execute()

            values = result.get('values', [])

            if not values:
                return {"error": "No data found"}

            # Transformar datos a formato estructurado
            headers = values[0]
            rows = values[1:]

            structured_data = []
            for row in rows:
                if len(row) < len(headers):
                    row.extend([""] * (len(headers) - len(row)))

                item = {headers[i]: row[i] for i in range(len(headers))}
                structured_data.append(item)

            return structured_data

        except Exception as e:
            print(f"Error al leer la hoja: {str(e)}")
            return {"error": str(e)}

# Singleton instance getter
def get_sheets_client():
    return GoogleSheetsClient()