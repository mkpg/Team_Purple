import React, { useState, useEffect, useRef, useContext } from 'react';
import { MessageSquare, X, ArrowLeft, Send, Link, ChevronRight } from 'lucide-react';
import { CraftShieldContext } from '../../context/CraftShieldContext';
import './DirectChat.css';

export default function DirectChat() {
  const { user, clientOrders, artisanOrders, apiFetch, t } = useContext(CraftShieldContext);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations'); // conversations, contacts
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // { id, name, role, business_name }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Fetch initial conversations/unread status
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/api/chat/conversations');
      setConversations(data);
      const unreadSum = data.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
      setTotalUnread(unreadSum);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/api/chat/contacts');
      setContacts(data);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const data = await apiFetch(`/api/chat/messages/${otherUserId}`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const wsRef = useRef(null);

  // Setup Real-time WebSockets with polling fallback
  useEffect(() => {
    if (!user) return;

    fetchConversations();
    fetchContacts();

    const connectWS = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Map Vite ports to backend port 8000
      let wsHost = window.location.host;
      if (wsHost.includes('localhost:') || wsHost.includes('127.0.0.1:')) {
        const portMatch = wsHost.match(/:(\d+)/);
        if (portMatch) {
          wsHost = wsHost.replace(portMatch[0], ':8000');
        }
      }
      
      const wsUrl = `${wsProtocol}//${wsHost}/api/chat/ws/${user._id || user.id}`;
      console.log("Opening chat WebSocket:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_MESSAGE') {
            const msg = data.message;
            // Append message instantly if relevant to current open chat
            if (selectedUser && (msg.sender_id === selectedUser.id || msg.recipient_id === selectedUser.id)) {
              setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
            fetchConversations();
          }
        } catch (e) {
          console.error("Error reading socket event:", e);
        }
      };

      ws.onclose = () => {
        console.warn("WebSocket closed. Attempting reconnect...");
        pollTimerRef.current = setTimeout(() => {
          connectWS();
        }, 5000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error context:", err);
        ws.close();
      };
    };

    connectWS();

    // Regular polling fallback to ensure synchronization
    const backupPoll = setInterval(() => {
      fetchConversations();
      if (selectedUser) {
        fetchMessages(selectedUser.id);
      }
    }, 10000);

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      clearInterval(backupPoll);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [user, selectedUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const handleSelectUser = (otherUser) => {
    setSelectedUser(otherUser);
    setMessages([]);
    fetchMessages(otherUser.id);
  };

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const payload = {
        recipient_id: selectedUser.id,
        message: newMessage,
        order_id: selectedOrderId || null
      };

      const sentMsg = await apiFetch('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setSelectedOrderId('');
      fetchConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // List of active orders to link
  const activeOrders = user?.role === 'client' ? clientOrders : artisanOrders;

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        id="direct-chat-fab"
        className="direct-chat-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Direct Chat"
      >
        <MessageSquare size={24} />
        {totalUnread > 0 && <span className="unread-badge">{totalUnread}</span>}
      </button>

      {/* Slide-Up Chat Drawer */}
      {isOpen && (
        <div className="direct-chat-drawer" id="direct-chat-drawer">
          {/* Header */}
          <div className="direct-chat-header">
            <h3 className="direct-chat-title">
              {selectedUser && (
                <button 
                  id="chat-back-button"
                  className="direct-chat-back-btn" 
                  onClick={() => setSelectedUser(null)}
                  title="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <span>{selectedUser ? (selectedUser.business_name || selectedUser.name) : 'Direct Messages'}</span>
            </h3>
            <button 
              className="direct-chat-close" 
              onClick={() => setIsOpen(false)}
              title="Close Chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Chat or List View */}
          {selectedUser ? (
            <div className="direct-active-chat">
              {/* Message bubbles */}
              <div className="direct-chat-messages-area" id="direct-chat-messages">
                {messages.length === 0 ? (
                  <div className="direct-empty-state">
                    No messages yet. Send a message to start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.sender_id === user._id || msg.sender_id === user.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={`direct-chat-bubble-wrapper ${isSent ? 'sent' : 'received'}`}
                      >
                        <div className="direct-chat-bubble">
                          {msg.message}
                        </div>
                        {msg.order_id && (
                          <div className="direct-chat-msg-time" style={{ fontSize: '10px', color: '#14b8a6', fontWeight: 'bold' }}>
                            Linked Order ID: {msg.order_id.slice(-6)}
                          </div>
                        )}
                        <div className="direct-chat-msg-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input area */}
              <form onSubmit={handleSendMessage} className="direct-chat-input-area">
                {/* Order linker dropdown */}
                <div className="direct-chat-order-select-container">
                  <span className="direct-chat-order-select-label">Link Order:</span>
                  <select 
                    id="chat-order-select"
                    className="direct-chat-order-select"
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                  >
                    <option value="">-- None --</option>
                    {activeOrders.map(order => (
                      <option key={order.id || order._id} value={order.id || order._id}>
                        Order #{String(order.id || order._id).slice(-6)} ({order.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="direct-chat-input-row">
                  <input
                    type="text"
                    id="direct-chat-text-input"
                    className="direct-chat-input"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    id="direct-chat-send-btn"
                    type="submit" 
                    className="direct-chat-send-btn"
                    disabled={!newMessage.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="direct-chat-tabs">
                <button 
                  className={`direct-chat-tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('conversations')}
                >
                  Chats
                </button>
                <button 
                  className={`direct-chat-tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('contacts')}
                >
                  Contacts
                </button>
              </div>

              {/* Conversations List */}
              {activeTab === 'conversations' && (
                <div className="direct-chat-list" id="direct-chat-conversations-list">
                  {conversations.length === 0 ? (
                    <div className="direct-empty-state">
                      No active conversations. Click Contacts to start a new chat!
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button 
                        key={conv.other_user_id} 
                        className={`direct-chat-item ${conv.unread_count > 0 ? 'unread' : ''}`}
                        onClick={() => handleSelectUser({
                          id: conv.other_user_id,
                          name: conv.other_user_name,
                          role: conv.other_user_role,
                          business_name: conv.business_name
                        })}
                      >
                        <div className="direct-avatar">
                          {conv.business_name ? conv.business_name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="direct-chat-info">
                          <div className="direct-chat-info-row">
                            <span className="direct-chat-name">{conv.business_name}</span>
                            <span className="direct-chat-time">
                              {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="direct-chat-info-row">
                            <span className="direct-chat-preview">{conv.last_message}</span>
                            {conv.unread_count > 0 && (
                              <span className="direct-chat-unread-count">{conv.unread_count}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Contacts List */}
              {activeTab === 'contacts' && (
                <div className="direct-chat-list" id="direct-chat-contacts-list">
                  {contacts.length === 0 ? (
                    <div className="direct-empty-state">
                      No contacts found.
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <button 
                        key={contact.id} 
                        className="direct-chat-item"
                        onClick={() => handleSelectUser(contact)}
                      >
                        <div className="direct-avatar">
                          {contact.business_name ? contact.business_name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="direct-chat-info">
                          <span className="direct-chat-name">{contact.business_name}</span>
                          <div className="direct-chat-preview" style={{ color: 'var(--color-secondary)' }}>
                            {contact.role.toUpperCase()}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
