import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { KNOWLEDGE_BASE } from './knowledge';

// --- Styles ---
const styles = `
  :root {
    --primary: #6B9080;
    --primary-dark: #4F6D5F;
    --secondary: #A4C3B2;
    --background: #F6FFF8;
    --surface: #FFFFFF;
    --text: #2D3436;
    --text-light: #636E72;
    --accent: #EAF4F4;
    --user-msg: #CCE3DE;
    --ai-msg: #FFFFFF;
  }

  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: var(--background);
    color: var(--text);
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  #root {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 1000px;
    margin: 0 auto;
    width: 100%;
    box-shadow: 0 0 20px rgba(0,0,0,0.05);
    background: var(--surface);
  }

  .header {
    padding: 20px 30px;
    background: var(--surface);
    border-bottom: 1px solid var(--accent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    background: var(--secondary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scroll-behavior: smooth;
  }

  .message {
    max-width: 80%;
    padding: 16px 20px;
    border-radius: 18px;
    line-height: 1.6;
    font-size: 0.95rem;
    animation: fadeIn 0.3s ease-out;
    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .message.user {
    align-self: flex-end;
    background-color: var(--user-msg);
    color: var(--text);
    border-bottom-right-radius: 4px;
  }

  .message.ai {
    align-self: flex-start;
    background-color: var(--ai-msg);
    border: 1px solid var(--accent);
    border-bottom-left-radius: 4px;
  }

  .input-area {
    padding: 20px 30px;
    background: var(--surface);
    border-top: 1px solid var(--accent);
    display: flex;
    gap: 15px;
    align-items: flex-end;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
  }

  textarea {
    width: 100%;
    padding: 15px;
    border: 1px solid var(--secondary);
    border-radius: 12px;
    resize: none;
    font-family: inherit;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    height: 24px;
    min-height: 24px;
    max-height: 150px;
    box-sizing: content-box; /* Important for autosizing logic */
    display: block;
  }

  textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(107, 144, 128, 0.1);
  }

  button {
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:hover {
    background-color: var(--primary-dark);
  }

  button:disabled {
    background-color: var(--secondary);
    cursor: not-allowed;
  }

  .typing-indicator {
    display: flex;
    gap: 5px;
    padding: 10px 15px;
    background: var(--ai-msg);
    border-radius: 18px;
    align-self: flex-start;
    border: 1px solid var(--accent);
    margin-bottom: 10px;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--secondary);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Markdown Styles */
  .markdown p { margin: 0 0 10px 0; }
  .markdown p:last-child { margin-bottom: 0; }
  .markdown ul, .markdown ol { margin: 10px 0; padding-left: 20px; }
  .markdown li { margin-bottom: 5px; }
  .markdown strong { color: var(--primary-dark); }
  
  .disclaimer {
    font-size: 0.7rem;
    color: var(--text-light);
    text-align: center;
    margin-top: 10px;
    opacity: 0.7;
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--secondary);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
  }
`;

// --- Components ---

const Message: React.FC<{ role: 'user' | 'model', content: string }> = ({ role, content }) => {
  return (
    <div className={`message ${role === 'model' ? 'ai' : 'user'}`}>
      <div className="markdown">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
);

const App = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: "Hello, I'm MindEase. I'm here to listen and support you. How are you feeling today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `You are "MindEase," an empathetic and thoughtful AI mental health support assistant. 
Your purpose is to provide emotionally supportive, informative, and sensitive responses to users seeking help or guidance related to mental wellness.

## Knowledge Context
You have access to a knowledge base (provided below) containing information on:
- Cognitive behavioral therapy (CBT)
- Stress and anxiety management
- Emotional intelligence
- Communication and empathy
- Self-care and mindfulness

Use this context as your primary factual and therapeutic reference.

## Behavior Rules
1. Always respond in an emotionally supportive tone — gentle, understanding, and encouraging.
2. Summarize or rephrase insights from the knowledge base when relevant. Do NOT act like a generic AI.
3. Do not offer medical diagnoses or crisis counseling; instead, suggest professional help when appropriate.
4. Avoid judgmental or directive language.
5. If the user expresses distress or self-harm thoughts, respond with empathy and encourage contacting a mental health helpline or trusted person.

## Interaction Style
- Keep responses around 100–200 words.
- Begin with a validating or empathetic sentence.
- Use bullet points or reflection questions when providing structured coping strategies.
- Use the provided Knowledge Base to answer.

## KNOWLEDGE BASE
${KNOWLEDGE_BASE}
`
        },
        history: history
      });
      
      const result = await chat.sendMessage({ message: userMessage });
      const response = result.text;

      if (response) {
        setMessages(prev => [...prev, { role: 'model', content: response }]);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="header">
        <div className="logo">
          <div className="logo-icon">M</div>
          MindEase
        </div>
      </div>

      <div className="chat-container">
        {messages.map((msg, idx) => (
          <Message key={idx} role={msg.role} content={msg.content} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind..."
            rows={1}
          />
        </div>
        <button onClick={handleSend} disabled={!input.trim() || isTyping}>
          Send
        </button>
      </div>
      <div className="disclaimer">
        MindEase is an AI assistant and does not replace professional medical advice. If you are in crisis, please contact emergency services.
      </div>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);