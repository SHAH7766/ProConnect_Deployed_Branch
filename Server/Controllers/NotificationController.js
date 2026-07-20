import Notification from "../Model/Notification.js"

export const createNotification = async ({ recipientId, recipientRole, type, title, message, bookingId = null }) => {
    try {
        await Notification.create({ recipientId, recipientRole, type, title, message, bookingId });
    } catch (error) {
        console.error("Failed to create notification:", error.message);
    }
};

export const GetMyNotifications = async (req, res) => {
    try {
        const { id, role } = req.user;
        const notifications = await Notification.find({ recipientId: id, recipientRole: role })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unreadCount = notifications.filter(n => !n.isRead).length;
        return res.send({ notifications, unreadCount, success: true });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const MarkNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        await Notification.findOneAndUpdate(
            { _id: id, recipientId: userId, recipientRole: role },
            { isRead: true }
        );
        return res.send({ success: true });
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const MarkAllNotificationsRead = async (req, res) => {
    try {
        const { id, role } = req.user;
        await Notification.updateMany(
            { recipientId: id, recipientRole: role, isRead: false },
            { isRead: true }
        );
        return res.send({ success: true });
    } catch (error) {
        console.error("Mark all notifications read error:", error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const GetUnreadCount = async (req, res) => {
    try {
        const { id, role } = req.user;
        const count = await Notification.countDocuments({ recipientId: id, recipientRole: role, isRead: false });
        return res.send({ unreadCount: count, success: true });
    } catch (error) {
        console.error("Get unread count error:", error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};
