import React, { useState, useRef, useEffect } from 'react';
import '../../styles/Header.css';
import { 
  Person, 
  Logout, 
  Help, 
  DarkMode,
  Notifications,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Email,
  AdminPanelSettings
} from '@mui/icons-material';

interface HeaderProps {
  username?: string;
  email?: string;
  profilePic?: string;
  role?: string;
  joinDate?: string;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  username = "Guest", 
  email = "guest@example.com",
  profilePic,
  role = "User",
  onLogout,
  onProfileClick,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    if (onProfileClick) onProfileClick();
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    if (onLogout) onLogout();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode', !isDarkMode);
    localStorage.setItem('darkMode', (!isDarkMode).toString());
  };

  // Load dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    document.body.classList.toggle('dark-mode', savedDarkMode);
  }, []);

  const clearNotifications = () => {
    setHasNotifications(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <div className="app-brand">
          <div className="brand-logo">
            <span className="logo-icon">💬</span>
          </div>
          <div className="brand-text">
            <span className="brand-name">TalkieFy</span>
            <span className="brand-tagline">Connect & Chat</span>
          </div>
        </div>
      </div>
      
      <div className="header-right" ref={dropdownRef}>
        {/* Notifications Icon */}
        <div className="notification-icon" onClick={clearNotifications}>
          <Notifications />
          {hasNotifications && <span className="notification-badge"></span>}
        </div>

        {/* User Profile with Dropdown */}
        <div className="user-profile-container">
          <button 
            className="profile-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-label="User profile menu"
          >
            <div className="profile-avatar">
              {profilePic ? (
                <img src={profilePic} alt={username} className="avatar-image" />
              ) : (
                <div className="avatar-fallback">
                  {getInitials(username)}
                </div>
              )}
              <div className="online-status"></div>
            </div>
            <div className="profile-info">
              <span className="username">{username}</span>
              <span className="user-role">{role}</span>
            </div>
            <span className="dropdown-arrow">
              {isDropdownOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="profile-dropdown">
              {/* User Info Section */}
              <div className="dropdown-section user-info-section">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {profilePic ? (
                      <img src={profilePic} alt={username} />
                    ) : (
                      <div className="avatar-fallback-large">
                        {getInitials(username)}
                      </div>
                    )}
                  </div>
                  <div className="dropdown-user-details">
                    <h3 className="dropdown-username">{username}</h3>
                    <p className="dropdown-email">
                      <Email fontSize="small" />
                      {email}
                    </p>
                    {role && (
                      <span className="dropdown-role">
                        <AdminPanelSettings fontSize="small" />
                        {role}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="dropdown-section menu-section">
                <button className="dropdown-item" onClick={handleProfileClick}>
                  <Person className="dropdown-icon" />
                  <span className="dropdown-text">My Profile</span>
                </button>
                
                {/* <button className="dropdown-item" onClick={handleSettingsClick}>
                  <Settings className="dropdown-icon" />
                  <span className="dropdown-text">Settings</span>
                  <span className="badge new">New</span>
                </button> */}
              </div>

              {/* Preferences Section */}
              <div className="dropdown-section preferences-section">
                <div className="dropdown-item">
                  <DarkMode className="dropdown-icon" />
                  <span className="dropdown-text">Dark Mode</span>
                  <div className="toggle-switch" onClick={toggleDarkMode}>
                    <div className={`toggle-slider ${isDarkMode ? 'active' : ''}`}></div>
                  </div>
                </div>
                
                <button className="dropdown-item">
                  <Help className="dropdown-icon" />
                  <span className="dropdown-text">Help & Support</span>
                </button>
              </div>

              {/* Logout Section */}
              <div className="dropdown-section logout-section">
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <Logout className="dropdown-icon" />
                  <span className="dropdown-text">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;