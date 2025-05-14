import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

class GenAIClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GenAIClient, cls).__new__(cls)
            cls._instance.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        return cls._instance

    def generate_content(self, prompt, model="gemini-2.0-flash"):
        """
        Generate content using the Gemini model

        Args:
            prompt (str): The prompt to send to the model
            model (str): The model to use, defaults to gemini-2.0-flash

        Returns:
            The response from the model
        """
        response = self.client.models.generate_content(
            model=model, contents=prompt
        )
        return response

def get_genai_client():
    return GenAIClient()

