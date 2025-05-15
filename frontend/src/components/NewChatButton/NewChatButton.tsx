import './NewChatButton.css'; // Importar el archivo CSS

export default function NewChatButton({ onClick }: { onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="new-chat-button"
      >
        <svg
          stroke="currentColor"
          fill="none"
          strokeWidth="2"
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="plus-icon"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span className="button-text">Nuevo chat</span>
      </button>
    );
  }