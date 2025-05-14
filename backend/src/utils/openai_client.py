import os
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI
from typing import List, Dict, Any

load_dotenv()

class OpenAIConversation:
    def __init__(self, conversation_id=None, model="gpt-4o-mini"):
        """
        Initialize a new conversation with OpenAI
        
        Args:
            conversation_id: Optional identifier for this conversation
            model: The model to use for this conversation
        """
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.conversation_id = conversation_id
        self.model = model
        self.message_history = []
        self.metadata = {}  # Para almacenar referencias a recursos externos
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation history"""
        self.message_history.append({"role": role, "content": content})
        
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """
        Generate a response based on the conversation history and new prompt
        
        Args:
            prompt: The new user message
            
        Returns:
            The response from the model
        """
        self.add_message("user", prompt)
        
        response = self.client.responses.create(
            model=self.model,
            input=self.message_history
        )
        
        # Add the assistant's response to history
        if hasattr(response, 'output_text'):
            self.add_message("assistant", response.output_text)
            
        return response

# Factory function to create new conversations
def create_conversation(conversation_id=None, model="gpt-4o"):
    return OpenAIConversation(conversation_id, model)