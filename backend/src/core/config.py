from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str | None = None      # si usas OpenAI
    allowed_origins: list[str] = ["*"]     # CORS

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
