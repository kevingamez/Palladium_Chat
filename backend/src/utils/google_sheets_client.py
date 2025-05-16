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

    def add_row(self, spreadsheet_id, sheet_name, values):
        """Añade una fila a la hoja de cálculo"""
        # Obtener el último índice de fila con datos
        result = self.sheets.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A:Z"
        ).execute()

        values_range = result.get('values', [])
        next_row = len(values_range) + 1

        # Añadir nueva fila
        self.sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A{next_row}",
            valueInputOption='RAW',
            body={'values': [values]}
        ).execute()

        return {
            'success': True,
            'message': f'Row added at position {next_row}',
            'row': next_row
        }

    def update_row(self, spreadsheet_id, sheet_name, row_index, values):
        """Actualiza una fila existente"""
        self.sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A{row_index}",
            valueInputOption='RAW',
            body={'values': [values]}
        ).execute()

        return {
            'success': True,
            'message': f'Row {row_index} updated'
        }

    def add_column(self, spreadsheet_id, sheet_name, column_name):
        """Añade una nueva columna"""
        # Obtener información de la hoja
        sheet_metadata = self.sheets.spreadsheets().get(
            spreadsheetId=spreadsheet_id
        ).execute()

        # Encontrar la siguiente columna libre
        sheets = sheet_metadata.get('sheets', [])
        for sheet in sheets:
            if sheet['properties']['title'] == sheet_name:
                # Añadir encabezado de la nueva columna
                properties = sheet['properties']
                num_columns = properties.get('gridProperties', {}).get('columnCount', 0)
                column_letter = self._index_to_column(num_columns)

                self.sheets.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"{sheet_name}!{column_letter}1",
                    valueInputOption='RAW',
                    body={'values': [[column_name]]}
                ).execute()

                return {
                    'success': True,
                    'message': f'Column "{column_name}" added at position {column_letter}',
                    'column': column_letter
                }

        return {'success': False, 'message': f'Sheet "{sheet_name}" not found'}

    def _index_to_column(self, index):
        """Convierte índice numérico a letra de columna (A, B, ..., Z, AA, AB, ...)"""
        result = ""
        index += 1  # Ajustar a base 1 para coincidencia con Excel/Sheets

        while index > 0:
            index, remainder = divmod(index - 1, 26)
            result = chr(65 + remainder) + result

        return result

# Singleton instance getter
def get_sheets_client():
    return GoogleSheetsClient()