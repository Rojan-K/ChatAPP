import React, { useState, useEffect } from 'react';
import '../../styles/GroupChat.css';
import { useGetFriendsQuery } from '../../lib/api';

interface Friend {
  id: number;
  name: string;
  email: string;
  profilePic?: string;
}

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, participants: number[]) => void;
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({ isOpen, onClose, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const { data: friendsData, isLoading: isLoadingFriends, error: friendsError } = useGetFriendsQuery();
  
  // Extract friends array from the API response
  const friends = friendsData?.data || [];

  const handleToggleParticipant = (friendId: number) => {
    setSelectedParticipants(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedParticipants.length > 0) {
      onCreateGroup(groupName.trim(), selectedParticipants);
      handleClose();
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedParticipants([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="group-modal-overlay" onClick={handleClose}>
      <div className="group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="group-modal-header">
          <h2>Create Group Chat</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="group-modal-content">
          <div className="group-name-input">
            <label>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={50}
            />
          </div>

          <div className="participants-section">
            <label>Select Participants ({selectedParticipants.length} selected)</label>
            <div className="friends-list">
              {isLoadingFriends ? (
                <div className="loading-friends">Loading friends...</div>
              ) : friendsError ? (
                <div className="error-friends">Error loading friends</div>
              ) : friends.length === 0 ? (
                <div className="no-friends">No friends available. Add some friends first!</div>
              ) : (
                friends?.map((friend: Friend) => (
                <div 
                  key={friend.id} 
                  className={`friend-item ${selectedParticipants.includes(friend.id) ? 'selected' : ''}`}
                  onClick={() => handleToggleParticipant(friend.id)}
                >
                  <div className="friend-avatar">
                    {friend.profilePic ? (
                      <img src={friend.profilePic} alt={friend.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">{friend.name}</span>
                    <span className="friend-email">{friend.email}</span>
                  </div>
                  <div className="selection-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(friend.id)}
                      onChange={() => handleToggleParticipant(friend.id)}
                    />
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>

        <div className="group-modal-footer">
          <button 
            className="cancel-btn" 
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            className="create-btn"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedParticipants.length === 0}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal;
