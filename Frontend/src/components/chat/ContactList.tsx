import React from 'react';
import '../../styles/ChatList.css';

interface Contact {
  id: number;
  name: string;
  email?: string;
  profilePic?: string;
  online: boolean;
  lastMessage?: string;
  time?: string;
  unread: number;
  roomName: string;
  isGroup?: boolean;
  participantCount?: number;
  role?: string;
}

interface ContactListProps {
  contacts: Contact[];
  activeContact: number | null;
  onSelectContact: (id: number) => void;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, activeContact, onSelectContact }) => {
  return (
    <div className="contact-list">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className={`contact-item ${activeContact === contact.id ? 'active' : ''} ${contact.isGroup ? 'group-chat' : ''}`}
          onClick={() => onSelectContact(contact.id)}
        >
          <div className="contact-avatar">
            <div className={`avatar ${contact.isGroup ? 'group' : (contact.online ? 'online' : 'offline')}`}>
              {contact.isGroup ? (
                // Group icon - show multiple user icons or group symbol
                <>
                  <span className="group-icon">👥</span>
                </>
              ) : (
                // Individual contact - show initials
                <>
                  {contact.name.charAt(0)}
                  {contact.name.charAt(contact.name.indexOf(' ')+1).toUpperCase()}
                </>
              )}
            </div>
          </div>
          <div className="contact-info">
            <div className="contact-header">
              <span className="contact-name">
                {contact.name}
                {contact.isGroup && contact.participantCount && (
                  <span className="participant-count">({contact.participantCount})</span>
                )}
              </span>
              <span className="message-time">{contact.time}</span>
            </div>
            <div className="contact-footer">
              <span className="last-message">
                {contact.isGroup && contact.lastMessage ? (
                  <>
                    {contact.role === 'admin' && <span className="role-badge">Admin</span>}
                    {contact.lastMessage}
                  </>
                ) : (
                  contact.lastMessage
                )}
              </span>
              {contact.unread > 0 && (
                <span className="unread-badge">{contact.unread}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactList;