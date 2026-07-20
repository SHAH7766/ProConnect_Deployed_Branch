import express from 'express'
import { GetMyNotifications, MarkNotificationRead, MarkAllNotificationsRead, GetUnreadCount } from "../Controllers/NotificationController.js"
import { VerifyToken } from "../Middleware/validator.js"

const router = express.Router()

router.get("/notifications", VerifyToken, GetMyNotifications)
router.get("/notifications/unread-count", VerifyToken, GetUnreadCount)
router.put("/notifications/:id/read", VerifyToken, MarkNotificationRead)
router.put("/notifications/read-all", VerifyToken, MarkAllNotificationsRead)

export default router
