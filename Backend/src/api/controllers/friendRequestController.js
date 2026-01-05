import FriendRequestModel from '../models/friendRequestModel.js';
import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';

export const sendFriendRequest = async (req, res) => {
    try {
        const { receiverId } = req.body;

        // Get current user ID from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;
        
        if (!email) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid user token" 
            });
        }

        // Get actual database user ID from email
        const userResult = await UserModel.findbyEmail(email);
        if (!userResult[0] || userResult[0].length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        const senderId = userResult[0][0].user_id;

        // Check if request already exists
        const existingRequest = await FriendRequestModel.checkExistingRequest(senderId, receiverId);
        if (existingRequest.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Friend request already sent or exists" 
            });
        }

        // Create friend request
        const result = await FriendRequestModel.createFriendRequest(senderId, receiverId);
        
        res.json({ 
            success: true, 
            message: "Friend request sent successfully",
            data: result
        });

    } catch (error) {
        console.error("Send friend request error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

export const getFriendRequests = async (req, res) => {
    try {
        // Get current user ID from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;
        
        if (!email) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid user token" 
            });
        }

        // Get actual database user ID from email
        const userResult = await UserModel.findbyEmail(email);
        if (!userResult[0] || userResult[0].length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        const userId = userResult[0][0].user_id;

        // Get friend requests for current user
        console.log('Getting friend requests for user ID:', userId); // Debug
        const requests = await FriendRequestModel.getFriendRequestsForUser(userId);
        console.log('Friend requests found:', requests); // Debug
        
        res.json({ 
            success: true, 
            data: requests
        });

    } catch (error) {
        console.error("Get friend requests error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get current user ID from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;
    
    if (!email) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid user token" 
      });
    }

    // Get actual database user ID from email
    const userResult = await UserModel.findbyEmail(email);
    if (!userResult[0] || userResult[0].length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    const userId = userResult[0][0].user_id;

    const result = await FriendRequestModel.acceptFriendRequest(requestId, userId);

    const io = req.app.get('io');
    
    const senderEventData = {
      friendId: userId,
      roomName: result.roomName,
      friendName: result.receiverName,
      friendEmail: result.receiverEmail
    };
    
    const receiverEventData = {
      friendId: result.friendId,
      roomName: result.roomName,
      friendName: result.senderName,
      friendEmail: result.senderEmail
    };
    
    console.log('Sending to sender (user_${result.friendId}):', senderEventData);
    console.log('Sending to receiver (user_${userId}):', receiverEventData);
    
    io.to(`user_${result.friendId}`).emit('friend_request_accepted', senderEventData);
    io.to(`user_${userId}`).emit('friend_request_accepted', receiverEventData);

    res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully',
      data: {
        roomName: result.roomName,
        friendId: result.friendId
      }
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting friend request',
      error: error.message
    });
  }
};

export const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        await FriendRequestModel.rejectFriendRequest(requestId);
        
        res.json({ 
            success: true, 
            message: "Friend request rejected successfully"
        });

    } catch (error) {
        console.error("Reject friend request error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};
