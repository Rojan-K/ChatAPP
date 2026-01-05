import express from 'express';
import { 
    sendFriendRequest, 
    getFriendRequests, 
    acceptFriendRequest, 
    rejectFriendRequest 
} from '../controllers/friendRequestController.js';

const router = express.Router();

// Send friend request
router.post('/send', sendFriendRequest);

// Get friend requests for current user
router.get('/', getFriendRequests);

// Accept friend request
router.put('/accept/:requestId', acceptFriendRequest);

// Reject friend request
router.put('/reject/:requestId', rejectFriendRequest);

export default router;
