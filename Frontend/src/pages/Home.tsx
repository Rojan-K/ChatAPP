
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import '../styles/Home.css';
import Header from '../components/layout/Header';
import ContactList from '../components/chat/ContactList';
import ChatWindow from '../components/chat/ChatWindow';
import FriendRequests from '../components/friends/FriendRequests';
import GroupChatModal from '../components/chat/GroupChatModal';
import { io, Socket } from 'socket.io-client';
import { 
  useSearchUsersQuery, 
  useSendFriendRequestMutation,
  useGetFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useGetFriendsQuery,
  useGetChatHistoryQuery,
  useSetMessageMutation,
  useCreateGroupChatMutation,
  useGetUserGroupsQuery,
  useSendGroupMessageMutation,
  useGetGroupChatHistoryQuery,
  type SearchResult,
} from '../lib/api';

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

const formatTime = (value: unknown): string | undefined => {
  if (!value) return undefined;

  const raw = String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [messages, setMessages] = useState<{[key: number]: Array<{id: number; text: string; time: string; sender: string; read?: boolean}>}>({});
  const [isTyping, setIsTyping] = useState<{[key: number]: boolean}>({});
  const [typingUsers, setTypingUsers] = useState<{[key: number]: string}>({});
  const [showGroupModal, setShowGroupModal] = useState(false);
  // Mutation hooks
  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [setMessage] = useSetMessageMutation();
  const [sendGroupMessage] = useSendGroupMessageMutation();
  const [createGroupChat] = useCreateGroupChatMutation();

  // Fetch friend requests
  const { data: friendRequestsData, refetch: refetchFriendRequests } = useGetFriendRequestsQuery();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const username: string = user?.Fullname ?? "Guest";

  // Get real friends from API
  const { data: friendsData, refetch: refetchFriends } = useGetFriendsQuery();
  
  // Get user's group chats
  const { data: groupsData} = useGetUserGroupsQuery();

  // In Home.tsx, combine friends and groups into contacts
  useEffect(() => {
    const allContacts: Contact[] = [];
    
    // Add friends
    if (friendsData?.data) {
      console.log('Friends data from API:', friendsData.data);
      const friendContacts = friendsData.data
        .filter(friend => friend.id !== user?.Id) // Filter out user's own account
        .map(friend => ({
          id: friend.id,
          name: friend.name || `User ${friend.id}`,
          email: friend.email || `user${friend.id}@example.com`,
          profilePic: friend.profilePic,
          online: friend.online || false,
          unread: 0,
          roomName: [user?.Id, friend.id].sort().join('_'),
          isGroup: false
        }));
      allContacts.push(...friendContacts);
    }
    
    // Add groups
    if (groupsData?.data) {
      console.log('Groups data from API:', groupsData.data);
      const groupContacts = groupsData.data.map(group => ({
        id: group.id,
        name: group.name,
        email: undefined,
        profilePic: undefined,
        online: false, // Groups don't have online status
        unread: 0,
        roomName: `group_${group.id}`,
        isGroup: true,
        participantCount: group.participant_count,
        role: group.role,
        lastMessage: group.last_message,
        time: formatTime(group.last_message_time)
      }));
      allContacts.push(...groupContacts);
    }
    
    console.log('Combined contacts:', allContacts);
    setContacts(allContacts);
  }, [friendsData, groupsData, user?.Id]);


  const { data: searchResults, isLoading: isSearching } = useSearchUsersQuery(debouncedSearchQuery, {
    skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2,
  });

  // Get chat history queries - separate for individual and group chats
  const activeContact = contacts.find(c => c.id === activeChat);
  const isGroupChat = activeContact?.isGroup || false;

  const { data: individualChatHistory, refetch: refetchIndividualChat } = useGetChatHistoryQuery({ 
    userId: activeChat || 0, 
    limit: 15 
  }, {
    skip: !activeChat || isGroupChat,
  });

  const { data: groupChatHistory, refetch: refetchGroupChat } = useGetGroupChatHistoryQuery({ 
    groupId: activeChat || 0, 
    limit: 15 
  }, {
    skip: !activeChat || !isGroupChat,
  });

  // Combine the data based on active chat type
  const chatHistoryData = activeChat && isGroupChat 
    ? groupChatHistory 
    : individualChatHistory;

  const refetchChatHistory = activeChat && isGroupChat 
    ? refetchGroupChat 
    : refetchIndividualChat;

  // Auto-refresh messages when window becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('Visibility changed, document.hidden:', document.hidden, 'activeChat:', activeChat);
      if (!document.hidden && activeChat) {
        console.log('Window became active, refreshing chat history for:', activeChat);
        refetchChatHistory();
      }
    };

    const handleWindowFocus = () => {
      console.log('Window gained focus, activeChat:', activeChat);
      if (activeChat) {
        console.log('Refreshing chat history for:', activeChat);
        refetchChatHistory();
      }
    };

    // Test if events are being added
    console.log('Adding window focus event listeners');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      console.log('Removing window focus event listeners');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [activeChat, refetchChatHistory]);

  // Load chat history when active chat changes
  useEffect(() => {
    if (activeChat) {
      console.log('Active chat changed to:', activeChat, 'loading chat history...');
      // The refetch will trigger the chatHistoryData to update
      refetchChatHistory();
    }
  }, [activeChat, refetchChatHistory]);

  // Update messages when chat history data is available
  useEffect(() => {
    if (activeChat && chatHistoryData && Array.isArray(chatHistoryData)) {
      const formattedMessages = chatHistoryData.map(msg => ({
        id: msg.id,
        text: msg.message,
        time: formatTime(msg.created_at) || '',
        sender: msg.sender_id === user?.Id ? 'me' : msg.sender_name,
        read: (msg as any).read_status || false // Handle both individual and group messages
      }));
      
      setMessages(prev => ({
        ...prev,
        [activeChat]: formattedMessages
      }));
    }
  }, [activeChat, chatHistoryData, user?.Id]);

  // Initialize Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && user) {
      console.log('=== INITIALIZING SOCKET ===');
      console.log('Token found:', !!token);
      console.log('User found:', !!user);
      
      socketRef.current = io('http://localhost:3000', {
        auth: {
          token: token
        }
      });

      const socket = socketRef.current;
      setSocketReady(true);
      
      console.log('Socket object created:', !!socket);
      console.log('Socket ID before connect:', socket.id);
      
      socket.on('connect', () => {
        console.log('=== SOCKET CONNECTED ===');
        console.log('Connected to Socket.io server with socket ID:', socket.id);
        console.log('User ID:', user?.Id);
        console.log('Setting up user_typing event listener...');
        
        // Set up event listeners AFTER connection
        socket.on('user_typing', (data) => {
          console.log('=== TYPING EVENT RECEIVED ===');
          console.log('Received typing indicator:', data);
          console.log('Current activeChat:', activeChat);
          console.log('Current isTyping state:', isTyping);
          console.log('Current typingUsers state:', typingUsers);
          
          const { isTyping: typing, userName, chatId } = data;
          
          console.log(`Updating isTyping for chat ${chatId}: ${typing}`);
          setIsTyping(prev => {
            const newState = { ...prev, [chatId]: typing };
            console.log('New isTyping state:', newState);
            return newState;
          });
          
          if (typing && userName) {
            console.log(`Setting typing user for chat ${chatId}: ${userName}`);
            setTypingUsers(prev => {
              const newState = { ...prev, [chatId]: userName };
              console.log('New typingUsers state:', newState);
              return newState;
            });
          } else {
            console.log(`Clearing typing user for chat ${chatId}`);
            setTypingUsers(prev => {
              const newState = { ...prev, [chatId]: '' };
              console.log('New typingUsers state:', newState);
              return newState;
            });
          }
        });
        
        console.log('user_typing event listener set up successfully');
        
        // Emit online status when connected
        socket.emit('user_status_change', { status: 'online' });
      });
      
      socket.on('connect_error', (error) => {
        console.log('=== SOCKET CONNECTION ERROR ===');
        console.log('Connection error:', error);
      });
      
      socket.on('disconnect', () => {
        console.log('=== SOCKET DISCONNECTED ===');
        console.log('Disconnected from Socket.io server');
      });

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, emit offline status
          socket.emit('user_status_change', { status: 'offline' });
        } else {
          // Page is visible, emit online status
          socket.emit('user_status_change', { status: 'online' });
        }
      };

      // Handle page unload (when user closes browser/tab)
      const handleBeforeUnload = () => {
        socket.emit('user_status_change', { status: 'offline' });
      };

      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        socket.off('connect');
        socket.off('user_typing');
        socket.off('disconnect');
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        socket.disconnect();
        socketRef.current = null;
        setSocketReady(false);
      };
    }
  }, [user]);

  useEffect(() => {
    const socket = socketRef.current;
    const groupList = groupsData?.data;
    if (!socketReady || !socket || !groupList || groupList.length === 0) return;

    const joinAllGroups = () => {
      groupList.forEach(group => {
        socket.emit('join_group_chat', group.id);
      });
    };

    // Join immediately (if already connected) and also on reconnect
    joinAllGroups();
    socket.on('connect', joinAllGroups);

    return () => {
      socket.off('connect', joinAllGroups);
    };
  }, [groupsData, socketReady]);

  // Join chat room when active chat changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socketReady || !socket || !activeChat) return;

    const joinActiveChatRoom = () => {
      const contact = contacts.find(c => c.id === activeChat);
      console.log('Joining chat room for activeChat:', activeChat);
      console.log('Current user ID:', user?.Id);

      if (contact?.isGroup) {
        socket.emit('join_group_chat', activeChat);
      } else {
        socket.emit('join_chat', activeChat);
      }
    };

    // Join immediately and on reconnect
    joinActiveChatRoom();
    socket.on('connect', joinActiveChatRoom);

    return () => {
      socket.off('connect', joinActiveChatRoom);
    };
  }, [activeChat, user?.Id, contacts, socketReady]);

  // Socket event handlers - moved inside useEffect to ensure proper access to latest state
  useEffect(() => {
    const socket = socketRef.current;
    if (!socketReady || !socket) return;

    // Define handleReceiveMessage inside useEffect to access latest state
    const handleReceiveMessage = (data: {
      id: number;
      senderId: number;
      senderName: string;
      receiverId: number;
      message: string;
      timestamp: string;
    }) => {
      console.log('=== RECEIVE MESSAGE DEBUG ===');
      console.log('Received message data:', data);
      console.log('Message (plain text):', data.message);
      
      // Messages are now sent as plain text (HTTPS/WSS provides security)
      const decryptedMessage = data.message;
      
      setMessages(prev => {
        const newMessage = {
          id: data.id,
          text: decryptedMessage,
          time: formatTime(data.timestamp) || '',
          sender: data.senderId === user?.Id ? 'me' : data.senderName,
          read: data.senderId === user?.Id
        };

        // Store messages under the correct chat key (always the other user's ID)
        const messageKey = data.senderId === user?.Id ? data.receiverId : data.senderId;
        console.log('Message key:', messageKey, 'New message:', newMessage);
        
        // Check if message already exists to prevent duplicates
        const existingMessages = prev[messageKey] || [];
        const messageExists = existingMessages.some(msg => 
          msg.id === data.id || (msg.text === decryptedMessage && msg.time === newMessage.time)
        );
        
        if (messageExists) {
          console.log('Message already exists, skipping duplicate');
          return prev;
        }
        
        return {
          ...prev,
          [messageKey]: [...existingMessages, newMessage]
        };
      });

      // Update contact's last message, time, and unread count
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === data.senderId
            ? { 
                ...contact, 
                lastMessage: decryptedMessage,
                time: formatTime(data.timestamp),
                unread: activeChat !== data.senderId ? (contact.unread || 0) + 1 : 0
              }
            : contact
        )
      );
    };

    const handleFriendRequestAccepted = (data: { friendId: number; roomName: string, friendName: string, friendEmail: string }) => {
      setContacts(prevContacts => {
        if (prevContacts.some(c => c.id === data.friendId)) {
          console.log('Friend already exists in contacts, skipping');
          return prevContacts;
        }

        const newContact: Contact = {
          id: data.friendId,
          name: data.friendName,
          email: data.friendEmail,
          online: false,
          lastMessage: '',
          time: '',
          unread: 0,
          roomName: data.roomName,
          isGroup: false
        };

        return [newContact, ...prevContacts];
      });
    };

    const handleFriendStatusChange = (data: { userId: number; status: string }) => {
      console.log('Received friend status change:', data);
      setContacts(prevContacts => {
        const updated = prevContacts.map(contact => 
          contact.id === data.userId 
            ? { ...contact, online: data.status === 'online' }
            : contact
        );
        console.log('Updated contacts after status change:', updated);
        return updated;
      });
    };

    const handleReceiveGroupMessage = (data: {
      id: number;
      senderId: number;
      senderName: string;
      groupId: number;
      message: string;
      timestamp: string;
    }) => {
      console.log('=== RECEIVE GROUP MESSAGE DEBUG ===');
      console.log('Received group message data:', data);
      console.log('Message (plain text):', data.message);
      
      // Messages are now sent as plain text (HTTPS/WSS provides security)
      const decryptedMessage = data.message;
      
      setMessages(prev => {
        const newMessage = {
          id: data.id,
          text: decryptedMessage,
          time: formatTime(data.timestamp) || '',
          sender: data.senderId === user?.Id ? 'me' : data.senderName,
          read: data.senderId === user?.Id
        };

        // Store messages under the group ID
        const messageKey = data.groupId;
        console.log('Group message key:', messageKey, 'New group message:', newMessage);
        
        // Check if message already exists to prevent duplicates
        const existingMessages = prev[messageKey] || [];
        const messageExists = existingMessages.some(msg => 
          msg.id === data.id || (msg.text === decryptedMessage && msg.time === newMessage.time)
        );
        
        if (messageExists) {
          console.log('Group message already exists, skipping duplicate');
          return prev;
        }
        
        console.log('Adding group message to state');
        return {
          ...prev,
          [messageKey]: [...existingMessages, newMessage]
        };
      });

      // Update group's last message, time, and unread count
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === data.groupId && contact.isGroup
            ? { 
                ...contact, 
                lastMessage: `${data.senderName}: ${decryptedMessage}`,
                time: formatTime(data.timestamp),
                unread: activeChat !== data.groupId ? (contact.unread || 0) + 1 : 0
              }
            : contact
        )
      );
      console.log('Group contact updated');
    };
    
    socket.on('receive_message', handleReceiveMessage);
    socket.on('receive_group_message', handleReceiveGroupMessage);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_status_change', handleFriendStatusChange);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('receive_group_message', handleReceiveGroupMessage);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_status_change', handleFriendStatusChange);
    };
  }, [activeChat, user?.Id, socketReady]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectContact = async (contactId: number) => {
    console.log('Selecting contact:', contactId);
    setActiveChat(contactId);
    
    // Mark messages as read when opening chat
    setContacts(prevContacts => 
      prevContacts.map(contact =>   
        contact.id === contactId 
          ? { ...contact, unread: 0 }
          : contact
      )
    );
    
    // Move active chat contact to top of the list
    setContacts(prevContacts => {
      const contactIndex = prevContacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        const newContacts = [...prevContacts];
        const [activeContact] = newContacts.splice(contactIndex, 1);
        newContacts.unshift(activeContact);
        return newContacts;
      }
      return prevContacts;
    });
  };

  const handleSendMessage = async (message: string) => {
    if (!activeChat || !message.trim()) return;
    
    console.log('=== SEND MESSAGE DEBUG ===');
    console.log('Sending message:', {
      message,
      activeChat,
      userID: user?.Id
    });

    const socket = socketRef.current;
    if (!socket) {
      console.error('Socket not connected');
      return;
    }
    
    const contact = contacts.find(c => c.id === activeChat);
    
    if (!contact) {
      console.error('Contact not found for activeChat:', activeChat);
      return;
    }
    
    console.log('Found contact:', contact);
    console.log('Is group chat:', contact.isGroup);

    const messageData = {
      receiverId: activeChat,
      message: message, // Send plain text to API for database storage
      roomName: contact.roomName,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending message via API:', messageData);
    
    try {
      if (contact.isGroup) {
        console.log('=== SENDING GROUP MESSAGE ===');
        // Send group message
        const result = await sendGroupMessage({
          groupId: activeChat,
          message: message,
          timestamp: messageData.timestamp
        }).unwrap();
        console.log('Group message saved via API successfully:', result);

        // Update local state using DB id (prevents duplicates when socket broadcast arrives)
        setMessages(prev => {
          const existing = prev[activeChat] || [];
          if (existing.some(m => m.id === result.id)) return prev;
          return {
            ...prev,
            [activeChat]: [
              ...existing,
              {
                id: result.id,
                text: message,
                time: formatTime(messageData.timestamp) || '',
                sender: 'me'
              }
            ]
          };
        });
      } else {
        console.log('=== SENDING INDIVIDUAL MESSAGE ===');
        // Send individual message
        const result = await setMessage({
          receiverId: messageData.receiverId,
          message: messageData.message,
          roomName: messageData.roomName,
          timestamp: messageData.timestamp
        }).unwrap();
        console.log('Message saved via API successfully:', result);

        // Update local state using DB id (prevents duplicates when socket broadcast arrives)
        setMessages(prev => {
          const existing = prev[activeChat] || [];
          if (existing.some(m => m.id === result.id)) return prev;
          return {
            ...prev,
            [activeChat]: [
              ...existing,
              {
                id: result.id,
                text: message,
                time: formatTime(messageData.timestamp) || '',
                sender: 'me'
              }
            ]
          };
        });
        
        // Send individual message via socket
        console.log('=== SOCKET DEBUG ===');
        console.log('Sending plain text message (HTTPS/WSS provides security):', message);
        
        socket.emit('send_message', {
          receiverId: activeChat,
          messageId: result.id,
          message: message, // Send plain text
          senderId: user?.Id,
          senderName: user?.Fullname,
          timestamp: messageData.timestamp
        });
        console.log('Individual message sent via socket');
      }

      console.log('Message sent to socket');

      // Update contact's last message and time for sender
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === activeChat
            ? { 
                ...contact, 
                lastMessage: message, // Use plain text for display
                time: formatTime(new Date().toISOString())
              }
            : contact
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const response = await acceptFriendRequest(requestId).unwrap();
      refetchFriendRequests();
      refetchFriends();
      if(response){
        console.log("Accepted the friend request");
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      refetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleCreateGroup = async (groupName: string, participants: number[]) => {
    try {
      const result = await createGroupChat({ groupName, participants }).unwrap();
      console.log('Group created successfully:', result);
      alert(`Group "${groupName}" created with ${participants.length} participants!`);
      // TODO: Refresh groups list or navigate to the new group
    } catch (error: any) {
      console.error('Error creating group:', error);
      alert(error.data?.message || 'Failed to create group. Please try again.');
    }
  };

  const handleSendFriendRequest = async (receiverId: number, event?: React.MouseEvent) => {
    // Prevent the search input from losing focus
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      await sendFriendRequest({ receiverId });
      setSentRequests(prev => new Set(prev).add(receiverId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    }
  };

  const handleLogout = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            logout();
            navigate('/');
        } else {
            console.error('Logout failed:', response.statusText);
            logout();
            navigate('/');
        }
    } catch (error) {
        console.error('Logout error:', error);
        logout();
        navigate('/');
    }
};

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="chat-app">
      {/* Top Header */}
      <Header 
        username={username} 
        email={user?.Email}
        profilePic={user?.profilePic}
        onLogout={handleLogout} 
        onProfileClick={handleProfileClick}
      />

      <div className="app-content">
        {/* Left Sidebar - Contacts */}
        <div className="contacts-sidebar">
          <div className="contacts-header">
            <h2>CONTACTS</h2>
          </div>
          
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => setIsSearchActive(true)}
              onBlur={() => setIsSearchActive(false)}
            />
            <button 
              className="create-group-btn"
              onClick={() => setShowGroupModal(true)}
              title="Create Group Chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </button>
          </div>

          {isSearchActive ? (
            <div className="searching-users">
              {isSearching ? (
                <p>Searching users...</p>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="search-results">
                 
                  {searchResults.map((user: SearchResult) => (
                    <div key={user.id} className="search-result-item">
                      <div className="user-info">
                        {user.profilePic ? (
                          <img src={user.profilePic} alt={user.Fullname} className="search-user-avatar" />
                        ) : (
                          <div className="search-user-avatar-placeholder">
                            {user.Fullname.charAt(0).toUpperCase()}
                            {user.Fullname.charAt(user.Fullname.indexOf(' ')+1).toUpperCase()}
                          </div>
                        )}
                        <div className="user-name">{user.Fullname}</div>
                      </div>
                      {sentRequests.has(user.id) ? (
                        <button className="add-friend-btn sent" disabled>
                          Sent
                        </button>
                      ) : user.isFriend ? (
                        <button className="add-friend-btn friend" disabled>
                          Friends
                        </button>
                      ) : (
                        <button 
                          className="add-friend-btn"
                          onMouseDown={(e) => handleSendFriendRequest(user.id, e)}
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <p>No users found</p>
              ) : (
                <p>Type at least 2 characters to search</p>
              )}
            </div>
          ) : (
            <ContactList 
              contacts={contacts}
              activeContact={activeChat}
              onSelectContact={handleSelectContact}
            />
          )}
            
          {/* Friend Requests Section */}
          <FriendRequests 
            requests={friendRequestsData?.data?.map(req => ({
              id: req.id,
              name: req.sender_name,
              status: req.status
            })) || []}
            isOpen={showFriendRequests}
            onClose={() => setShowFriendRequests(false)}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        </div>

        {/* Right Side - Chat Area */}
        <div className="chat-area">
          {activeChat ? (
            <>
              {console.log('Rendering ChatWindow with activeChat:', activeChat, 'messages:', messages[activeChat])}
              <ChatWindow
                contact={contacts.find(c => c.id === activeChat) || undefined}
                messages={activeChat ? messages[activeChat] || [] : []}
                onSendMessage={handleSendMessage}
                isTyping={activeChat ? isTyping[activeChat] || false : false}
                typingUser={activeChat ? typingUsers[activeChat] || '' : ''}
                activeChat={activeChat}
                socket={socketRef.current}
                onClose={() => setActiveChat(null)}
              />
              {console.log('ChatWindow props:', {
                activeChat,
                isTyping: activeChat ? isTyping[activeChat] || false : false,
                typingUser: activeChat ? typingUsers[activeChat] || '' : '',
                contact: contacts.find(c => c.id === activeChat)
              })}
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="welcome-message">
                <h2>Welcome to TalkieFy</h2>
                <p>Select a contact to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <GroupChatModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
};

export default Home;
