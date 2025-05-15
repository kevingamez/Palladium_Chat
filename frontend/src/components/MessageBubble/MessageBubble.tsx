import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';

type MessageBubbleProps = {
    role: 'user' | 'assistant';
    content: string;
    streaming?: boolean;
  }

export default function MessageBubble({
    role,
    content,
    streaming,
  }: MessageBubbleProps) {
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
  