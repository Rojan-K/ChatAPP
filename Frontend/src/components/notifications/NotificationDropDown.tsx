import React, { useState, useEffect, useRef } from 'react';
import './NotificationDropdown.css';

interface Notification {
  id: number;
  type: 'message' | 'friend_request' | 'friend_accepted';
  message: string;
  related_id?: number;
  created_at: string;
  read_status: boolean;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: number) => void;
  onNotificationClick: (notification: Notification) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onNotificationClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification);
    if (!notification.read_status) {
      onMarkAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button 
        className="notification-button"
        onClick={() => setIsOpen(!isOpen)}
      >
               <span className="notification-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="notification-dropdown-content">
          <div className="notification-header">
            <h4>Notifications</h4>
            {notifications.length === 0 ? (
              <p className="no-notifications">No new notifications</p>
            ) : (
              <button 
                className="mark-all-read"
                onClick={() => notifications
                  .filter(n => !n.read_status)
                  .forEach(n => onMarkAsRead(n.id))}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read_status ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-message">
                  <p>{notification.message}</p>
                  <span className="notification-time">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                {!notification.read_status && (
                  <span className="unread-dot"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;