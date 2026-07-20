import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, ListGroup, Spinner } from 'react-bootstrap';
import { FiBell, FiCheck, FiX, FiClock, FiCheckCircle, FiAlertCircle, FiDollarSign, FiMessageCircle, FiCalendar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
};

const TYPE_ICONS = {
  new_booking: FiBell,
  booking_accepted: FiCheckCircle,
  booking_declined: FiX,
  booking_in_progress: FiClock,
  booking_completed: FiCheckCircle,
  booking_cancelled: FiX,
  payment_released: FiDollarSign,
  payment_paid: FiDollarSign,
  booking_adjusted: FiCalendar,
  provider_activated: FiCheckCircle,
  new_message: FiMessageCircle,
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);
  const dropdownRef = useRef(null);
  const prevCountRef = useRef(0);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const toastTimer = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setNotifications(data.notifications || []);
        const prevCount = prevCountRef.current;
        const newCount = data.unreadCount || 0;
        setUnreadCount(newCount);

        // Show toast for new notifications that arrived since last poll
        if (prevCount > 0 && newCount > prevCount && data.notifications?.length > 0) {
          const latest = data.notifications[0];
          if (!latest.isRead) {
            playBeep();
            setToastNotif(latest);
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToastNotif(null), 5000);
          }
        }
        prevCountRef.current = newCount;
      }
    } catch {
      // silently ignore
    }
  }, [isLoggedIn]);

  // Poll for new notifications
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (toastNotif) {
      toastTimer.current = setTimeout(() => setToastNotif(null), 5000);
    }
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [toastNotif]);

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id);
        if (removed && !removed.isRead) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch {
      // silently ignore
    }
  };

  const handleNotificationClick = (notif) => {
    handleMarkRead(notif._id);
    setShowDropdown(false);
    if (notif.bookingId) {
      navigate('/my-bookings');
    } else {
      navigate('/profile');
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isLoggedIn) return null;

  const latestUnread = notifications.find(n => !n.isRead);

  return (
    <>
      {/* Toast popup for new notification */}
      {toastNotif && (
        <div
          className="notification-toast"
          onClick={() => handleNotificationClick(toastNotif)}
        >
          <div className="notification-toast-icon">
            {React.createElement(TYPE_ICONS[toastNotif.type] || FiBell, { size: 18 })}
          </div>
          <div className="notification-toast-content">
            <strong>{toastNotif.title}</strong>
            <small>{toastNotif.message}</small>
          </div>
          <button className="notification-toast-close" onClick={(e) => { e.stopPropagation(); setToastNotif(null); }}>
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Bell icon with badge */}
      <div className="notification-bell-wrapper" ref={dropdownRef}>
        <button
          className="btn btn-link p-0 border-0 position-relative theme-toggle-btn"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Notifications"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <Badge
              bg="danger"
              pill
              className="notification-badge"
              style={{ fontSize: '0.6rem', position: 'absolute', top: -6, right: -8 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="notification-dropdown">
            <div className="notification-dropdown-header">
              <span className="fw-bold">Notifications</span>
              {unreadCount > 0 && (
                <button className="btn btn-sm btn-link p-0 text-decoration-none" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="notification-dropdown-body">
              {notifications.length === 0 ? (
                <div className="text-center text-muted py-4 small">
                  <FiBell size={24} className="mb-2 opacity-50" />
                  <div>No notifications yet</div>
                </div>
              ) : (
                notifications.slice(0, 20).map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] || FiBell;
                  return (
                    <div
                      key={notif._id}
                      className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notification-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="notification-item-content">
                        <div className="notification-item-title">{notif.title}</div>
                        <div className="notification-item-message">{notif.message}</div>
                        <div className="notification-item-time">{formatTime(notif.createdAt)}</div>
                      </div>
                      {!notif.isRead && (
                        <button
                          className="notification-mark-read"
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }}
                          title="Mark as read"
                        >
                          <FiCheck size={12} />
                        </button>
                      )}
                      <button
                        className="notification-delete"
                        onClick={(e) => handleDeleteNotification(notif._id, e)}
                        title="Dismiss"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationBell;
