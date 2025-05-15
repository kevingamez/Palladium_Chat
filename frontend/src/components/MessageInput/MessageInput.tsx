import { useState } from 'react';
import './MessageInput.css'; // Importar el archivo CSS

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string, files: File[]) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text, files);
      setText('');
      setFiles([]); // Limpiar archivos después de enviar
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="message-form">
      <div className="input-container">
        {files.length > 0 && (
          <div className="files-preview">
            {files.map((file, index) => (
              <div key={index} className="file-preview-item">
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="textarea-wrapper">
          <textarea
            tabIndex={0}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Message Palladium..."
            className="message-textarea"
            style={{ maxHeight: '200px', minHeight: '56px', overflowY: 'auto' }}
          />

          {files.length > 0 && (
            <div className="attached-files-display">
              {files.map((file, i) => (
                <div key={i} className="attached-file">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-actions">
            <div className="file-upload-controls">
              <input
                type="file"
                multiple
                id="file-upload"
                className="file-input"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </label>
            </div>

            <button
              disabled={disabled || !text.trim()}
              className="send-button"
              type="submit"
            >
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="send-icon"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}