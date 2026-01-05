import React from 'react';
import '../../styles/FriendRequest.css';

interface FriendRequest {
  id: number;
  name: string;
  status: string;
}

interface FriendRequestsProps {
  requests: FriendRequest[];
  isOpen: boolean;
  onClose: () => void;
  onAcceptRequest?: (requestId: number) => void;
  onRejectRequest?: (requestId: number) => void;
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ requests, isOpen, onClose, onAcceptRequest, onRejectRequest }) => {
  if (!isOpen) return null;

  return (
    <div className="friend-requests">
      <div className="requests-header">
        <h3>Chat Requests</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="new-requests-label">
        <span>New Requests</span>
      </div>

      <div className="requests-list">
        {requests.map((request) => (
          <div key={request.id} className="request-item">
            <div className="request-avatar">
              <div className="avatar online">
                {request.name.charAt(0)}
              </div>
            </div>
            <div className="request-info">
              <div className="request-name">{request.name}</div>
              <div className="request-status">{request.status}</div>
            </div>
            <div className="request-actions">
              <button 
                className="accept-btn" 
                onClick={() => onAcceptRequest?.(request.id)}
              >
                Accept
              </button>
              <button 
                className="reject-btn" 
                onClick={() => onRejectRequest?.(request.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="no-requests">
          No new friend requests
        </div>
      )}
    </div>
  );
};

export default FriendRequests;