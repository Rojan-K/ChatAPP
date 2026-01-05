import NotificationModel from '../models/notificationModel.js';

export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { limit = 20 } = req.query;
        
        const notifications = await NotificationModel.getUserNotifications(userId, parseInt(limit));
        
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error("Get notifications error: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.uid;
        
        const result = await NotificationModel.markNotificationAsRead(parseInt(notificationId), userId);
        
        if (result === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });
    } catch (error) {
        console.error("Mark notification as read error: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user.uid;
        
        const unreadCount = await NotificationModel.getUnreadNotificationCount(userId);
        
        res.status(200).json({
            success: true,
            data: { unreadCount }
        });
    } catch (error) {
        console.error("Get unread notification count error: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};