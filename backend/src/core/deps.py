from fastapi import Depends
from google.oauth2.service_account import Credentials
from jira import JIRA
from .config import settings

def get_gsheets_creds():
    creds = Credentials.from_service_account_file("credentials.json", scopes=[
        "https://www.googleapis.com/auth/spreadsheets"
    ])
    return creds

def get_jira():
    return JIRA(
        server=settings.jira_server,
        basic_auth=(settings.jira_user, settings.jira_api_token)
    )
