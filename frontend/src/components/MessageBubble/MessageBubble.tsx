import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';

type MessageBubbleProps = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    streaming?: boolean;
    files?: string[];
  }

export default function MessageBubble({
    role,
    content,
    streaming,
    files
  }: MessageBubbleProps) {
    // Detectar mensajes de archivos subidos
    const isFileUploadMessage = content.includes('User uploaded files:');

    if (isFileUploadMessage) {
      const fileNames = content
        .replace('User uploaded files:', '')
        .split(',')
        .map(name => name.trim());

      return (
        <div className="files-message">
          <div className="files-indicator">
            <div className="files-list">
              {fileNames.map((name, i) => (
                <div key={i} className="uploaded-file">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`message-bubble ${role}`}>
        <div className="message-container">
          <div className="message-content-wrapper">
            <div className="message-text">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                {streaming && (
                  <span className="cursor-pulse">▋</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  