import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import '../styles/ChatbotWidget.css';

const ChatbotWidget = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis l\'assistant Frollot. Je connais tout le catalogue, vos commandes, vos clubs... Posez-moi n\'importe quelle question !' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Envoyer l'historique (sans le message système initial, max 10 derniers)
      const history = newMessages
        .filter(m => !m.error)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const { reply } = await aiService.chatbot(text, location.pathname, history.slice(0, -1));
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errorMsg = err?.response?.data?.code === 'quota_exceeded'
        ? 'Quota IA journalier atteint. Revenez demain !'
        : 'Désolé, une erreur est survenue. Réessayez.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, error: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, location.pathname, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      { role: 'assistant', content: 'Conversation réinitialisée. Comment puis-je vous aider ?' }
    ]);
  };

  // Ne pas afficher si non connecté
  if (!isAuthenticated) return null;

  return (
    <div className="chatbot-widget">
      <button
        className={`chatbot-widget__toggle ${open ? 'chatbot-widget__toggle--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer l\'assistant' : 'Ouvrir l\'assistant Frollot'}
        title="Assistant Frollot"
      >
        {open ? (
          <i className="fas fa-times" />
        ) : (
          <i className="fas fa-comment-dots" />
        )}
      </button>

      {open && (
        <div className="chatbot-widget__panel" role="dialog" aria-label="Assistant Frollot">
          <div className="chatbot-widget__header">
            <div className="chatbot-widget__header-info">
              <i className="fas fa-robot" />
              <span>Assistant Frollot</span>
            </div>
            <div className="chatbot-widget__header-actions">
              <button className="chatbot-widget__clear" onClick={handleClear} aria-label="Nouvelle conversation" title="Nouvelle conversation">
                <i className="fas fa-redo" />
              </button>
              <button className="chatbot-widget__close" onClick={() => setOpen(false)} aria-label="Fermer">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          <div className="chatbot-widget__messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-widget__msg chatbot-widget__msg--${msg.role} ${msg.error ? 'chatbot-widget__msg--error' : ''}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chatbot-widget__msg chatbot-widget__msg--assistant chatbot-widget__msg--loading">
                <span className="chatbot-widget__typing">
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-widget__input-area">
            <textarea
              ref={inputRef}
              className="chatbot-widget__input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Prix d'un livre, navigation, commandes..."
              rows={1}
              disabled={loading}
            />
            <button
              className="chatbot-widget__send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Envoyer"
            >
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
