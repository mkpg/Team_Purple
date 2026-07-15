import React, { useState, useEffect, useRef, useContext } from 'react';
import { Send, X, Sparkles } from 'lucide-react';
import { CraftShieldContext } from '../../context/CraftShieldContext';
import { useNavigate } from 'react-router-dom';
import './VoiceAssistant.css';

const suggestionsMap = {
  en: [
    { label: 'How to place order?', text: 'How do I place an order?' },
    { label: 'Check order status', text: 'Check my order status' },
    { label: 'Payment Vault rules', text: 'Explain payment vault rules' },
    { label: 'Navigate to Profile', text: 'Go to my Profile' }
  ],
  ta: [
    { label: 'ஆர்டர் செய்வது எப்படி?', text: 'ஆர்டர் செய்வது எப்படி?' },
    { label: 'ஆர்டர் நிலை என்ன?', text: 'என் ஆர்டர் நிலை என்ன?' },
    { label: 'பெட்டக விதிகள்', text: 'பாதுகாப்பு பெட்டக விதிகள் என்ன?' },
    { label: 'சுயவிவரம் செல்', text: 'என் சுயவிவரத்திற்கு செல்' }
  ],
  te: [
    { label: 'ఆర్డర్ ఎలా చేయాలి?', text: 'నేను ఆర్డర్ ఎలా చేయాలి?' },
    { label: 'ఆర్డర్ స్థితి', text: 'నా ఆర్డర్ స్థితి ఏమిటి?' },
    { label: 'వాల్ట్ నియమాలు', text: 'సేఫ్ వాల్ట్ నియమాలను వివరించండి' },
    { label: 'ప్రొఫైల్ వెళ్ళు', text: 'నా ప్రొఫైల్ కి వెళ్ళు' }
  ],
  kn: [
    { label: 'ಆರ್ಡರ್ ಮಾಡುವುದು ಹೇಗೆ?', text: 'ಆರ್ಡರ್ ಮಾಡುವುದು ಹೇಗೆ?' },
    { label: 'ಆರ್ಡರ್ ಸ್ಟೇಟಸ್', text: 'ನನ್ನ ಆರ್ಡರ್ ಸ್ಟೇಟಸ್ ತಿಳಿಸಿ' },
    { label: 'ಪಾವತಿ ನಿಯಮಗಳು', text: 'ಪಾವತಿ ವಾಲ್ಟ್ ನಿಯಮಗಳನ್ನು ತಿಳಿಸಿ' },
    { label: 'ಪ್ರಸಾದ್ ಗೆ ಹೋಗಿ', text: 'ನನ್ನ ಪ್ರೊಫೈಲ್ ಗೆ ಹೋಗಿ' }
  ],
  ml: [
    { label: 'ഓർഡർ നൽകുന്നത് എങ്ങനെ?', text: 'ഓർഡർ നൽകുന്നത് എങ്ങനെ?' },
    { label: 'ഓർഡർ സ്റ്റാറ്റസ്', text: 'എന്റെ ഓർഡർ സ്റ്റാറ്റസ് എന്താണ്?' },
    { label: 'പേയ്‌മെന്റ് നിയമങ്ങൾ', text: 'സുരക്ഷിത പേയ്‌മെന്റ് വോൾട്ട് നിയമങ്ങൾ' },
    { label: 'പ്രൊഫൈലിൽ പോകുക', text: 'എന്റെ പ്രൊഫൈലിൽ പോകുക' }
  ]
};

const defaultGreetings = {
  en: "Hello! I am your CraftShield AI Chat Assistant. How can I help you today?",
  ta: "வணக்கம்! நான் உங்கள் கிராஃப்ட்ஷீல்டு AI அரட்டை உதவியாளர். உங்களுக்கு நான் எவ்வாறு உதவ முடியும்?",
  te: "నమస్కారం! నేను మీ క్రాఫ్ట్‌షీల్డ్ AI చాట్ అసిస్టెంట్. ఈరోజు మీకు నేను ఎలా సహాయపడగలను?",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕ್ರಾಫ್ಟ್‌ಶೀಲ್ಡ್ AI ಚಾಟ್ ಸಹಾಯಕ. ಇಂದು ನಿಮಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
  ml: "ഹലോ! ഞാൻ നിങ്ങളുടെ ക്രാഫ്റ്റ്ഷീൽഡ് AI ചാറ്റ് അസിസ്റ്റന്റ് ആണ്. ഇന്ന് ഞാൻ നിങ്ങൾക്ക് എങ്ങനെയാണ് സഹായിക്കേണ്ടത്?"
};

export default function VoiceAssistant() {
  const { user, clientOrders, artisanOrders, apiFetch, t } = useContext(CraftShieldContext);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lang, setLang] = useState('en');
  const [textQuery, setTextQuery] = useState('');
  const [status, setStatus] = useState('Idle');

  const messagesEndRef = useRef(null);

  // Welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = defaultGreetings[lang] || defaultGreetings.en;
      setMessages([{ sender: 'assistant', text: greeting, source: 'sarvam' }]);
    }
  }, [isOpen, lang]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setTextQuery('');
    setStatus(t('Thinking...'));

    try {
      const data = await apiFetch('/api/voice-assistant/ask', {
        method: 'POST',
        body: JSON.stringify({ message: text, lang: lang })
      });
      
      const reply = data.reply;
      const source = data.source || 'sarvam';
      setMessages(prev => [...prev, { sender: 'assistant', text: reply, source }]);
      setStatus('Idle');
      
      // Navigation helper
      const q = text.toLowerCase();
      if (q.includes('profile') || q.includes('சுயவிவர') || q.includes('ప్రొఫైల్') || q.includes('ಪ್ರೊಫೈಲ್') || q.includes('പ്രൊഫൈൽ')) {
        setTimeout(() => navigate('/profile'), 1500);
      } else if (q.includes('home') || q.includes('dashboard') || q.includes('portal') || q.includes('studio') || q.includes('முகப்பு') || q.includes('ஹோಮ್')) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      console.error("Backend AI assistant call failed:", err);
      const errMsg = err.detail || err.message || "Sarvam AI API failed to respond. Please check Server or API key settings.";
      setMessages(prev => [...prev, { sender: 'assistant', text: `❌ Sarvam AI Error: ${errMsg}`, source: 'error' }]);
      setStatus('Error');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        id="voice-assistant-fab"
        className="voice-assistant-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Chat Assistant"
      >
        <Sparkles size={24} />
      </button>

      {/* Slide-Up Panel / Drawer */}
      {isOpen && (
        <div className="voice-assistant-drawer" id="voice-assistant-drawer">
          {/* Header */}
          <div className="voice-assistant-header">
            <h3 className="voice-assistant-title">
              <Sparkles size={18} />
              <span>AI Chat Assistant</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="voice-assistant-close" 
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="voice-lang-selector">
            <label htmlFor="voice-lang">Language / மொழி / భాష / ಭಾಷೆ:</label>
            <select 
              id="voice-lang" 
              className="voice-lang-select" 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="en">English (English)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
          </div>

          {/* Chat Messages */}
          <div className="voice-messages" id="voice-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`voice-msg ${msg.sender}`}>
                <div>{msg.text}</div>
                {msg.sender === 'assistant' && (
                  <span className={`voice-source-badge ${msg.source || 'sarvam'}`}>
                    {msg.source === 'sarvam' ? '✨ Sarvam AI' : 
                     msg.source === 'error' ? '⚠️ Error' : '⚙️ Local Assistant'}
                  </span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions pills */}
          <div className="voice-suggestions">
            {(suggestionsMap[lang] || suggestionsMap.en).map((s, idx) => (
              <button
                key={idx}
                className="voice-suggest-btn"
                onClick={() => handleSendMessage(s.text)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Footer Input Area */}
          <div className="voice-input-area">
            <input
              type="text"
              id="voice-text-input"
              className="voice-text-input"
              placeholder="Ask about your orders, vault, or contract..."
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(textQuery)}
            />
            <button 
              className="voice-mic-btn"
              onClick={() => handleSendMessage(textQuery)}
              title="Send Text"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Status Bar */}
          <div className="voice-status-bar">
            Status: {status}
          </div>
        </div>
      )}
    </>
  );
}
