import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import MessageModel from '../api/models/messageModel.js';
import NotificationModel from '../api/models/notificationModel.js';
import UserModel from '../api/models/userModel.js';
import TokenModel from '../api/models/tokenModel.js';
import EncryptionUtils from '../utils/encryption.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      // First verify JWT signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Then validate token in database
      const tokenData = await TokenModel.validateAccessToken(token);
      
      if (!tokenData) {
        return next(new Error('Authentication error'));
      }

      socket.userId = tokenData.user_id;
      socket.email = tokenData.email;
      socket.fullName = tokenData.full_name;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    // User data is already available from database validation
    socket.username = socket.fullName || socket.email;
    console.log(`User ${socket.username} connected with ID: ${socket.userId}`);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Update user status to online in database
    try {
      console.log(`Setting user ${socket.userId} status to online...`);
      await UserModel.updateUserStatus(socket.userId, 'online');
      console.log(`Updated user ${socket.userId} status to online`);
      
      // Broadcast online status to friends
      const friends = await UserModel.getFriends(socket.userId);
      console.log(`Found ${friends.length} friends for user ${socket.userId}:`, friends);
      friends.forEach(friend => {
        console.log(`Broadcasting online status to friend ${friend.id}`);
        io.to(`user_${friend.id}`).emit('friend_status_change', {
          userId: socket.userId,
          status: 'online'
        });
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
 
    // Handle joining chat rooms
    socket.on('join_chat', (chatUserId) => {
      const roomName = [socket.userId, chatUserId].sort().join('_');
      socket.join(roomName);
      console.log(`User ${socket.email} (ID: ${socket.userId}) joined chat room: ${roomName} for chat with user ${chatUserId}`);

      // Log all rooms this socket is in
      const rooms = Array.from(socket.rooms);
      console.log(`Socket ${socket.id} is now in rooms:`, rooms);
    });

    // Handle joining group chat rooms
    socket.on('join_group_chat', (groupId) => {
      const roomName = `group_${groupId}`;
      socket.join(roomName);
      console.log(`User ${socket.email} (ID: ${socket.userId}) joined group chat room: ${roomName}`);

      // Log all rooms this socket is in
      const rooms = Array.from(socket.rooms);
      console.log(`Socket ${socket.id} is now in rooms:`, rooms);
    });

    // Handle user status changes (online/offline when switching tabs)
    socket.on('user_status_change', async (data) => {
      const { status } = data;
      console.log(`User ${socket.email} changed status to: ${status}`);
      
      try {
        await UserModel.updateUserStatus(socket.userId, status);
        console.log(`Updated user ${socket.userId} status to ${status}`);
        
        // Broadcast status change to friends
        const friends = await UserModel.getFriends(socket.userId);
        friends.forEach(friend => {
          io.to(`user_${friend.id}`).emit('friend_status_change', {
            userId: socket.userId,
            status: status
          });
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });

    // Handle sending group messages (real-time only)
    socket.on('send_group_message', async (data) => {
      const { groupId, messageId, message, senderId, senderName, timestamp } = data;

      try {
        const roomName = `group_${groupId}`;
        io.to(roomName).emit('receive_group_message', {
          id: messageId || Date.now(),
          groupId,
          senderId: senderId || socket.userId,
          senderName: senderName || socket.username,
          message,
          timestamp: timestamp || new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error broadcasting group message:', error);
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    // Handle sending private messages
    socket.on('send_message', async (data) => {
      const { receiverId, message, timestamp, roomName } = data;
      
      console.log(`Received send_message event:`, {
        senderId: socket.userId,
        receiverId,
        message,
        roomName,
        timestamp
      });
      
      console.log('About to enter try block for message processing...');
      console.log('Socket userId:', socket.userId);
      console.log('Socket email:', socket.email);
      
      try {
        console.log('Processing message for real-time broadcast only...');
        // Message is already saved via API, so just use the provided data
        const messageId = data.messageId || Date.now(); // Use messageId from API or generate temporary ID
        
        console.log('Broadcasting message with ID:', messageId);
        
        // Send message as plain text (HTTPS/WSS provides security)
        let encryptedMessage = message;
        console.log('Sending plain text message (HTTPS/WSS provides security)');
        
        // Create notification for receiver
        await NotificationModel.createNotification(
          receiverId,
          socket.userId, 
          'message', 
          `New message from ${socket.email}`
        );
        
        // Use the roomName from client or generate if not provided
        const chatRoom = roomName || [socket.userId, receiverId].sort().join('_');
        
        // Ensure sender is in the chat room
        socket.join(chatRoom);
        console.log(`Sender ${socket.userId} joined room: ${chatRoom}`);
        
        // Find and join receiver to the chat room
        const receiverSockets = await io.in(`user_${receiverId}`).fetchSockets();
        receiverSockets.forEach(receiverSocket => {
          receiverSocket.join(chatRoom);
          console.log(`Receiver ${receiverId} joined room: ${chatRoom}`);
        });
        
        console.log(`Broadcasting message to room: ${chatRoom}`);
        
        // Check how many sockets are in this room
        const socketsInRoom = io.sockets.adapter.rooms.get(chatRoom);
        console.log(`Sockets in room ${chatRoom}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
        
        // Broadcast message to both users in the chat room
        io.to(chatRoom).emit('receive_message', {
          id: messageId,
          senderId: socket.userId,
          senderName: socket.username,
          receiverId,
          message: encryptedMessage, // Now plain text
          timestamp: timestamp || new Date().toISOString(),
          read: false
        });

        console.log(`Message broadcasted successfully to room ${chatRoom}`);

        // Send notification to receiver's personal room
        io.to(`user_${receiverId}`).emit('new_notification', {
          type: 'message',
          message: `New message from ${socket.email}`,
          senderId: socket.userId,
          senderName: socket.username,
          messageId
        });

        console.log(`Message from ${socket.email} to user ${receiverId}: ${message}`);
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators for private chats
    socket.on('typing_start', (receiverId) => {
      console.log(`=== RECEIVED TYPING_START ===`);
      console.log(`From user: ${socket.username} (${socket.userId})`);
      console.log(`To receiver: ${receiverId}`);
      
      io.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.username,
        isTyping: true,
        chatId: socket.userId // Use sender's ID as chatId for private chats
      });
      
      console.log(`Broadcasted typing indicator to user_${receiverId}`);
    });

    socket.on('typing_stop', (receiverId) => {
      console.log(`=== RECEIVED TYPING_STOP ===`);
      console.log(`From user: ${socket.username} (${socket.userId})`);
      console.log(`To receiver: ${receiverId}`);
      
      io.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.username,
        isTyping: false,
        chatId: socket.userId // Use sender's ID as chatId for private chats
      });
      
      console.log(`Broadcasted typing stop to user_${receiverId}`);
    });

    // Handle typing indicators for group chats
    socket.on('group_typing_start', (groupId) => {
      console.log(`=== GROUP TYPING START ===`);
      console.log(`Received group_typing_start from user ${socket.username} for group ${groupId}`);
      const roomName = `group_${groupId}`;
      console.log(`Socket rooms before emit:`, Array.from(socket.rooms));
      console.log(`Emitting to room: ${roomName}`);
      
      socket.to(roomName).emit('user_typing', {
        userId: socket.userId,
        userName: socket.username,
        isTyping: true,
        chatId: groupId
      });
      
      console.log(`Broadcasted typing indicator to room: ${roomName}`);
      
      // Check who's in the room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
      console.log(`Sockets in room ${roomName}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
    });

    socket.on('group_typing_stop', (groupId) => {
      console.log(`=== GROUP TYPING STOP ===`);
      console.log(`Received group_typing_stop from user ${socket.username} for group ${groupId}`);
      const roomName = `group_${groupId}`;
      socket.to(roomName).emit('user_typing', {
        userId: socket.userId,
        userName: socket.username,
        isTyping: false,
        chatId: groupId
      });
      console.log(`Broadcasted typing stop to room: ${roomName}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.email} disconnected`);
      
      // Update user status to offline in database
      try {
        await UserModel.updateUserStatus(socket.userId, 'offline');
        console.log(`Updated user ${socket.userId} status to offline`);
        
        // Broadcast offline status to friends
        const friends = await UserModel.getFriends(socket.userId);
        friends.forEach(friend => {
          io.to(`user_${friend.id}`).emit('friend_status_change', {
            userId: socket.userId,
            status: 'offline'
          });
        });
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    });
  });

  return io; 
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};