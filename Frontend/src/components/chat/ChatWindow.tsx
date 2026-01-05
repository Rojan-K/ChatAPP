import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import '../../styles/ChatWindow.css';
import { Send, AttachFile, InsertEmoticon, Close } from '@mui/icons-material';

interface Message {
  id: number;
  text: string;
  time: string;
  sender: 'me' | string;
  read?: boolean;
}

interface ChatWindowProps {
  contact: {
    id: number;
    name: string;
    online: boolean;
    isGroup?: boolean;
    participantCount?: number;
    role?: string;
  } | undefined;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  typingUser?: string;
  activeChat: number | null;
  socket?: any; // Add socket reference for typing indicators
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, messages, onSendMessage, isTyping, typingUser, activeChat, socket, onClose }) => {
  console.log('ChatWindow render:', { 
    contact: contact?.name, 
    isTyping, 
    typingUser, 
    activeChat, 
    isGroup: contact?.isGroup,
    fullContact: contact
  });
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Function to extract initials from a name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    // Get first letter of first name and first letter of last name
    const firstName = parts[0].charAt(0).toUpperCase();
    const lastName = parts[parts.length - 1].charAt(0).toUpperCase();
    return firstName + lastName;
  };

  const bubbleVars = useMemo(() => {
    const contactSeed = contact?.id ?? 0;
    const bucket = Math.floor(messages.length / 6);
    const baseHue = (Math.abs(contactSeed) * 29 + bucket * 9) % 360;

    const hueToRgb = (hue: number) => {
      const c = 1;
      const x = 1 - Math.abs(((hue / 60) % 2) - 1);
      let r1 = 0;
      let g1 = 0;
      let b1 = 0;

      if (hue < 60) {
        r1 = c;
        g1 = x;
        b1 = 0;
      } else if (hue < 120) {
        r1 = x;
        g1 = c;
        b1 = 0;
      } else if (hue < 180) {
        r1 = 0;
        g1 = c;
        b1 = x;
      } else if (hue < 240) {
        r1 = 0;
        g1 = x;
        b1 = c;
      } else if (hue < 300) {
        r1 = x;
        g1 = 0;
        b1 = c;
      } else {
        r1 = c;
        g1 = 0;
        b1 = x;
      }

      return {
        r: Math.round(r1 * 255),
        g: Math.round(g1 * 255),
        b: Math.round(b1 * 255),
      };
    };

    const sentRgb = hueToRgb(baseHue);
    const receivedRgb = hueToRgb((baseHue + 210) % 360);

    const sent = `rgba(${sentRgb.r}, ${sentRgb.g}, ${sentRgb.b}, 0.72)`;
    const received = `rgba(${receivedRgb.r}, ${receivedRgb.g}, ${receivedRgb.b}, 0.18)`;

    return {
      ['--sent-bubble-bg' as any]: sent,
      ['--received-bubble-bg' as any]: received,
    } as React.CSSProperties;
  }, [contact?.id, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Typing indicator handlers
  const handleTypingStart = useCallback(() => {
    console.log('handleTypingStart called', { socket: !!socket, activeChat, inputMessage: inputMessage.trim(), isGroup: contact?.isGroup });
    if (socket && activeChat && inputMessage.trim()) {
      if (contact?.isGroup) {
        console.log('Emitting group_typing_start for chat:', activeChat);
        socket.emit('group_typing_start', activeChat);
      } else {
        console.log('Emitting typing_start for chat:', activeChat);
        socket.emit('typing_start', activeChat);
      }
    }
  }, [socket, activeChat, inputMessage, contact?.isGroup]);

  const handleTypingStop = useCallback(() => {
    console.log('handleTypingStop called', { socket: !!socket, activeChat, isGroup: contact?.isGroup });
    if (socket && activeChat) {
      if (contact?.isGroup) {
        console.log('Emitting group_typing_stop for chat:', activeChat);
        socket.emit('group_typing_stop', activeChat);
      } else {
        console.log('Emitting typing_stop for chat:', activeChat);
        socket.emit('typing_stop', activeChat);
      }
    }
  }, [socket, activeChat, contact?.isGroup]);

  // Handle input change with typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    if (value.trim()) {
      handleTypingStart();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator after 1 second
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop();
      }, 1000);
    } else {
      handleTypingStop();
    }
  };

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
      handleTypingStop(); // Stop typing when message is sent
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!contact) {
    return null;
  }
  
  return (
    <div className="chat-window" style={bubbleVars}>
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className={`contact-avatar ${contact.isGroup ? 'group' : (contact.online ? 'online' : 'offline')}`}>
            {contact.isGroup ? (
              <span className="group-icon">👥</span>
            ) : (
              <>
                {contact.name.charAt(0)}
                {contact.name.charAt(contact.name.indexOf(' ')+1).toUpperCase()}
              </>
            )}
          </div>
          <div className="contact-details">
            <h3>
              {contact.name}
              {contact.isGroup && contact.participantCount && (
                <span className="participant-count">({contact.participantCount})</span>
              )}
            </h3>
            <span className="status">
              {contact.isGroup ? (
                contact.role === 'admin' ? 'Group Admin' : 'Group Member'
              ) : (
                contact.online ? 'Online' : 'Offline'
              )}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn">
            <span>⋮</span>
          </button>
          <button className="action-btn" onClick={onClose} title="Close Chat">
            <Close fontSize="small" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        <div className="messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
            >
              {message.sender !== 'me' && (
                <div className="message-avatar">
                  {getInitials(message.sender)}
                </div>
              )}
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {message.time}
                  {message.sender === 'me' && (
                    <span className="read-status">
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <span className="typing-text">
                {contact.isGroup && typingUser ? typingUser : contact.name} is typing...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <div className="input-actions">
          <button className="action-btn">
            <InsertEmoticon />
          </button>
          <button className="action-btn">
            <AttachFile />
          </button>
        </div>
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="message-input"
          />
        </div>
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!inputMessage.trim()}
        >
          <Send />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;