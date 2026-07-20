import express from 'express'
import { GetMyNotifications, MarkNotificationRead, MarkAllNotificationsRead, GetUnreadCount, DeleteNotification } from "../Controllers/NotificationController.js"
import { VerifyToken } from "../Middleware/validator.js"

const router = express.Router()

router.get("/notifications", VerifyToken, GetMyNotifications)
router.get("/notifications/unread-count", VerifyToken, GetUnreadCount)
router.put("/notifications/:id/read", VerifyToken, MarkNotificationRead)
router.put("/notifications/read-all", VerifyToken, MarkAllNotificationsRead)
router.delete("/notifications/:id", VerifyToken, DeleteNotification)

export default router
