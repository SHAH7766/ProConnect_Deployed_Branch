import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { Badge, Button, Form, Modal, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiBookmark, FiCalendar, FiCamera, FiCheckCircle, FiClock, FiCreditCard, FiEdit3, FiFilter, FiImage, FiMapPin, FiMessageCircle, FiSearch, FiStar, FiTrash2, FiTrendingUp, FiMic, FiSquare, FiX, FiSend, FiRefreshCw } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const getChatSeenKey = (userId, bookingId) => `chatLastSeen:${userId}:${bookingId}`;

const getErrorMessage = (err, fallback) => {
    const responseMessage = err.response?.data?.Message || err.response?.data?.message;
    if (responseMessage) return responseMessage;
    if (typeof err.response?.data === 'string' && err.response.data.trim()) return err.response.data;
    if (err.response?.status) return `${fallback} Server returned ${err.response.status}.`;
    return fallback;
};

const getGeneratedSandboxAccountNumber = (providerId = '') => providerId
    ? `SBX-${providerId.toString().slice(-12).toUpperCase()}`
    : '';

const MyBookings = () => {
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showChatModal, setShowChatModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [showAdjustAmountModal, setShowAdjustAmountModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState('');
    const [selectedPhotoTitle, setSelectedPhotoTitle] = useState('Photo');
    const [messages, setMessages] = useState([]);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [submittingCompletion, setSubmittingCompletion] = useState(false);
    const [releasingPayment, setReleasingPayment] = useState(false);
    const [adjustingAmount, setAdjustingAmount] = useState(false);
    const [deletingAllBookings, setDeletingAllBookings] = useState(false);
    const [payingBookingId, setPayingBookingId] = useState('');
    const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
    const [providerAccountNumber, setProviderAccountNumber] = useState('');
    const [completionPhoto, setCompletionPhoto] = useState(null);
    const [completionPreview, setCompletionPreview] = useState('');
    const [adjustAmountForm, setAdjustAmountForm] = useState({ newAmount: '', reason: '' });
    const [chatMessage, setChatMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [adjustAmountModalMode, setAdjustAmountModalMode] = useState('adjust');
    const [showAdjustmentHistoryModal, setShowAdjustmentHistoryModal] = useState(false);
    const [bookingFilter, setBookingFilter] = useState('All Types');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    const baseURL = API_BASE_URL;

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await axios.get(`${baseURL}/api/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(data.profile);
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    }, [baseURL, token]);

    const fetchBookings = useCallback(async () => {
        try {
            const { data } = await axios.get(`${baseURL}/api/mybookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookings(data);
        } catch (err) {
            console.error("Bookings fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [baseURL, token]);

    useEffect(() => {
        fetchProfile();
        fetchBookings();
    }, [fetchProfile, fetchBookings]);

    useEffect(() => {
        if (!showChatModal || !selectedBooking) return;

        const intervalId = setInterval(() => {
            fetchMessages(selectedBooking._id, false).then((chatMessages) => {
                markChatAsRead(selectedBooking._id, chatMessages);
            });
            // Auto-refresh bookings while chat is open to get updated fare/status
            fetchBookings();
        }, 3000);

        return () => clearInterval(intervalId);
    }, [showChatModal, selectedBooking?._id, profile?._id]);

    // Auto-refresh bookings every 15s + on tab focus to catch updates from the other side
    useAutoRefresh(fetchBookings, 15000);

    // Keep selectedBooking continuously synchronized with bookings updates
    useEffect(() => {
        if (selectedBooking && bookings && bookings.length > 0) {
            const updatedBooking = bookings.find(b => b._id === selectedBooking._id);
            if (updatedBooking) {
                if (updatedBooking.charges !== selectedBooking.charges ||
                    updatedBooking.status !== selectedBooking.status ||
                    updatedBooking.chargesHistory?.length !== selectedBooking.chargesHistory?.length) {
                    setSelectedBooking(updatedBooking);
                }
            }
        }
    }, [bookings]);

    useEffect(() => {
        return () => {
            if (completionPreview) URL.revokeObjectURL(completionPreview);
        };
    }, [completionPreview]);

    const updateBookingStatus = async (bookingId, status) => {
        try {
            const { data } = await axios.put(`${baseURL}/api/bookings/${bookingId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message, type: 'success' });
            fetchBookings();
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to update booking.", type: 'danger' });
        }
    };

    const confirmCustomerCompletion = async (bookingId) => {
        if (!window.confirm('Confirm that the provider completed this work?')) return;

        try {
            const { data } = await axios.put(`${baseURL}/api/bookings/${bookingId}/status`, { customerCompletionConfirmed: true }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message || "Work completion confirmed.", type: 'success' });
            fetchBookings();
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to confirm completed work.", type: 'danger' });
        }
    };

    const updatePaymentStatus = async (bookingId, paymentStatus, successMessage, extraPayload = {}) => {
        try {
            const { data } = await axios.put(`${baseURL}/api/bookings/${bookingId}/status`, { paymentStatus, ...extraPayload }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message || successMessage, type: 'success' });
            fetchBookings();
            return true;
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to update payment.", type: 'danger' });
            return false;
        }
    };

    const startSafepayCheckout = async (bookingId) => {
        try {
            setPayingBookingId(bookingId);
            const { data } = await axios.post(`${baseURL}/api/bookings/${bookingId}/safepay/checkout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = data.checkoutUrl;
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to start Safepay checkout.", type: 'danger' });
            setPayingBookingId('');
        }
    };

    const releaseBookingPayment = (booking) => {
        setSelectedBooking(booking);
        setProviderAccountNumber(
            booking.providerId?.sandboxBankAccount?.accountNumber || getGeneratedSandboxAccountNumber(booking.providerId?._id)
        );
        setShowReleaseModal(true);
    };

    const closeReleaseModal = () => {
        if (releasingPayment) return;

        setShowReleaseModal(false);
        setProviderAccountNumber('');
    };

    const submitReleasePayment = async (e) => {
        e.preventDefault();
        const trimmedAccountNumber = providerAccountNumber.trim();

        if (!selectedBooking || !trimmedAccountNumber) {
            setToast({ show: true, message: 'Please enter the provider account number.', type: 'danger' });
            return;
        }

        try {
            setReleasingPayment(true);
            const wasReleased = await updatePaymentStatus(selectedBooking._id, 'Released', "Payment released to provider.", {
                providerAccountNumber: trimmedAccountNumber
            });
            if (wasReleased) closeReleaseModal();
        } finally {
            setReleasingPayment(false);
        }
    };

    const openAdjustAmountModal = (booking, mode = 'adjust') => {
        setSelectedBooking(booking);
        setAdjustAmountModalMode(mode);
        setAdjustAmountForm({ newAmount: booking.charges || '', reason: '' });
        setShowAdjustAmountModal(true);
    };

    const closeAdjustAmountModal = () => {
        if (adjustingAmount) return;
        setShowAdjustAmountModal(false);
        setAdjustAmountModalMode('adjust');
        setAdjustAmountForm({ newAmount: '', reason: '' });
        setSelectedBooking(null);
    };

    const submitAdjustAmount = async (e) => {
        e.preventDefault();
        if (!selectedBooking) return;

        const newAmount = Number(adjustAmountForm.newAmount);
        if (!Number.isFinite(newAmount) || newAmount <= 0) {
            setToast({ show: true, message: 'Please enter a valid amount greater than 0.', type: 'danger' });
            return;
        }

        if (adjustAmountModalMode === 'counteroffer' && newAmount >= Number(selectedBooking.charges)) {
            setToast({ show: true, message: 'Counteroffer must be lower than the current offer.', type: 'danger' });
            return;
        }

        try {
            setAdjustingAmount(true);
            const { data } = await axios.put(`${baseURL}/api/bookings/${selectedBooking._id}/adjust-amount`,
                { newAmount, reason: adjustAmountForm.reason || '' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setToast({ show: true, message: data.Message, type: 'success' });
            fetchBookings();
            closeAdjustAmountModal();
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to adjust amount.", type: 'danger' });
        } finally {
            setAdjustingAmount(false);
        }
    };

    const openCompletionProof = (booking) => {
        setSelectedBooking(booking);
        setCompletionPhoto(null);
        setCompletionPreview('');
        setShowCompletionModal(true);
    };

    const closeCompletionProof = () => {
        setShowCompletionModal(false);
        setCompletionPhoto(null);
        setCompletionPreview('');
    };

    const handleCompletionPhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setToast({ show: true, message: 'Please select an image file.', type: 'danger' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setToast({ show: true, message: 'Image must be 5MB or smaller.', type: 'danger' });
            return;
        }

        if (completionPreview) URL.revokeObjectURL(completionPreview);
        setCompletionPhoto(file);
        setCompletionPreview(URL.createObjectURL(file));
    };

    const submitCompletionProof = async (e) => {
        e.preventDefault();
        if (!selectedBooking || !completionPhoto) {
            setToast({ show: true, message: 'Please upload a completion proof photo.', type: 'danger' });
            return;
        }

        try {
            setSubmittingCompletion(true);
            const payload = new FormData();
            payload.append('completionPhoto', completionPhoto);

            const { data } = await axios.put(`${baseURL}/api/bookings/${selectedBooking._id}/complete`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setToast({ show: true, message: data.Message, type: 'success' });
            closeCompletionProof();
            fetchBookings();
        } catch (err) {
            setToast({ show: true, message: getErrorMessage(err, "Unable to submit completion proof."), type: 'danger' });
        } finally {
            setSubmittingCompletion(false);
        }
    };

    const declineBookingRequest = async (bookingId) => {
        if (!window.confirm('Decline this offer? The provider will be notified.')) return;

        try {
            const { data } = await axios.put(`${baseURL}/api/bookings/${bookingId}/decline`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message, type: 'success' });
            fetchBookings();
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to decline booking.", type: 'danger' });
        }
    };

    const deleteAllBookings = async () => {
        if (!isAdmin || bookings.length === 0) return;
        if (!window.confirm(`Delete all ${bookings.length} bookings? This cannot be undone.`)) return;

        try {
            setDeletingAllBookings(true);
            const { data } = await axios.delete(`${baseURL}/api/bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message || 'All bookings deleted successfully.', type: 'success' });
            setBookings([]);
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to delete all bookings.", type: 'danger' });
        } finally {
            setDeletingAllBookings(false);
        }
    };

    const fetchMessages = async (bookingId, showErrors = true) => {
        try {
            const { data } = await axios.get(`${baseURL}/api/bookings/${bookingId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(data);
            return data;
        } catch (err) {
            if (showErrors) {
                setShowChatModal(false);
                setToast({ show: true, message: err.response?.data?.Message || "Unable to open chat.", type: 'danger' });
            }
            return [];
        }
    };

    const markChatAsRead = (bookingId, chatMessages = []) => {
        const incomingMessages = chatMessages.filter((item) => item.senderId?.toString() !== profile?._id?.toString());
        const latestIncoming = incomingMessages[incomingMessages.length - 1];
        if (profile?._id && latestIncoming?.createdAt) {
            localStorage.setItem(getChatSeenKey(profile._id, bookingId), latestIncoming.createdAt);
        }
    };

    const openChat = async (booking) => {
        if (['Requested', 'Negotiation', 'Cancelled', 'Disputed'].includes(booking.status) || (booking.status === 'Accepted' && booking.paymentStatus !== 'Paid')) {
            setToast({ show: true, message: 'Chat is available only after payment is completed.', type: 'info' });
            return;
        }

        if (booking.status === 'In-Progress' || booking.status === 'Completed') {
            setToast({ show: true, message: 'Chat is unavailable once work starts.', type: 'info' });
            return;
        }

        setSelectedBooking(booking);
        setShowChatModal(true);
        const chatMessages = await fetchMessages(booking._id);
        markChatAsRead(booking._id, chatMessages);
    };

    const replaceMessage = (tempId, nextMessage) => {
        setMessages((current) => current.map((item) => item._id === tempId ? nextMessage : item));
    };

    const removeMessage = (tempId) => {
        setMessages((current) => current.filter((item) => item._id !== tempId));
    };

    const addMessageIfMissing = (nextMessage) => {
        setMessages((current) => {
            if (current.some((item) => item._id === nextMessage._id)) return current;
            return [...current, nextMessage];
        });
    };

    const getMessageSenderName = (item) => {
        const senderId = item.senderId?.toString();
        if (senderId === profile?._id?.toString()) return 'You';
        if (senderId === selectedBooking?.providerId?._id?.toString()) return selectedBooking.providerId.name || 'Provider';
        if (senderId === selectedBooking?.customerId?._id?.toString()) return selectedBooking.customerId.name || 'Customer';
        return item.senderRole === 'provider' ? 'Provider' : item.senderRole === 'user' ? 'Customer' : 'Admin';
    };


    const submitChatMessage = async (e) => {
        if (e) e.preventDefault();
        if (!selectedBooking || !chatMessage.trim()) return;

        const messageText = chatMessage;
        setChatMessage('');
        
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            bookingId: selectedBooking._id,
            senderId: profile?._id,
            senderRole: profile?.role,
            message: messageText,
            createdAt: new Date().toISOString(),
            pending: true
        };

        addMessageIfMissing(optimisticMessage);

        try {
            setSendingMessage(true);
            const { data } = await axios.post(`${baseURL}/api/bookings/${selectedBooking._id}/messages`, {
                message: messageText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            replaceMessage(tempId, data.chatMessage);
        } catch (err) {
            removeMessage(tempId);
            setChatMessage(messageText);
            setToast({ show: true, message: err.response?.data?.Message || "Unable to send message.", type: 'danger' });
        } finally {
            setSendingMessage(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access error:", err);
            setToast({ show: true, message: 'Could not access microphone.', type: 'danger' });
        }
    };

    const stopRecordingAndSend = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            
            const tempId = `temp-${Date.now()}`;
            const optimisticMessage = {
                _id: tempId,
                bookingId: selectedBooking._id,
                senderId: profile?._id,
                senderRole: profile?.role,
                message: 'Voice message',
                createdAt: new Date().toISOString(),
                pending: true
            };

            addMessageIfMissing(optimisticMessage);

            try {
                setSendingMessage(true);
                const formData = new FormData();
                formData.append('voiceMessage', audioBlob, 'voice.webm');
                
                const { data } = await axios.post(`${baseURL}/api/bookings/${selectedBooking._id}/messages`, formData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                replaceMessage(tempId, data.chatMessage);
            } catch (err) {
                removeMessage(tempId);
                setToast({ show: true, message: err.response?.data?.Message || "Unable to send voice message.", type: 'danger' });
            } finally {
                setSendingMessage(false);
            }
        };

        mediaRecorderRef.current.stop();
    };

    const cancelRecording = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
        mediaRecorderRef.current.onstop = () => {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            audioChunksRef.current = [];
        };
        mediaRecorderRef.current.stop();
    };

    const openReview = (booking) => {
        setSelectedBooking(booking);
        setReviewForm({ rating: '5', comment: '' });
        setShowReviewModal(true);
    };

    const submitReview = async (e) => {
        e.preventDefault();
        if (!selectedBooking) return;

        try {
            setSubmittingReview(true);
            const { data } = await axios.post(`${baseURL}/api/bookings/${selectedBooking._id}/review`, reviewForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ show: true, message: data.Message, type: 'success' });
            setBookings(bookings.map((booking) => booking._id === selectedBooking._id ? { ...booking, hasReview: true } : booking));
            setShowReviewModal(false);
        } catch (err) {
            setToast({ show: true, message: err.response?.data?.Message || "Unable to submit review.", type: 'danger' });
        } finally {
            setSubmittingReview(false);
        }
    };

    const openProblemPhoto = (photo, title = 'Problem Picture') => {
        setSelectedPhoto(photo);
        setSelectedPhotoTitle(title);
        setShowPhotoModal(true);
    };

    const getPaymentBadgeVariant = (paymentStatus) => {
        if (paymentStatus === 'Released') return 'success';
        if (paymentStatus === 'Paid') return 'info';
        if (paymentStatus === 'Refunded') return 'danger';
        return 'secondary';
    };

    const getPaymentLabel = (paymentStatus) => {
        if (paymentStatus === 'Paid') return 'Paid - Held';
        if (paymentStatus === 'Released') return 'Released';
        return paymentStatus;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    const isAdmin = profile?.role === 'admin';
    const bookingFilters = ['All Types', 'Consultations', 'Site Visits', 'Follow-up'];

    const getBookingType = (booking) => {
        const category = `${booking.serviceCategory || ''} ${booking.description || ''}`.toLowerCase();
        if (category.includes('site') || category.includes('visit')) return 'Site Visits';
        if (category.includes('follow')) return 'Follow-up';
        return 'Consultations';
    };

    const filteredBookings = bookingFilter === 'All Types'
        ? bookings
        : bookings.filter((booking) => getBookingType(booking) === bookingFilter);

    const getStatusVariant = (status) => {
        if (status === 'Completed') return 'success';
        if (status === 'Cancelled' || status === 'Disputed') return 'danger';
        if (status === 'Accepted' || status === 'In-Progress') return 'primary';
        return 'warning';
    };

    const getOtherPartyName = (booking) => {
        if (isAdmin) return booking.providerId?.name || booking.customerId?.name || 'Booking';
        return profile?.role === 'provider'
            ? booking.customerId?.name || 'Customer'
            : booking.providerId?.name || 'Provider';
    };

    const getBookingInitial = (booking) => {
        const label = getOtherPartyName(booking) || booking.serviceCategory || 'B';
        return label.trim().charAt(0).toUpperCase() || 'B';
    };

    const formatBookingDate = (scheduledDate) => scheduledDate
        ? new Date(scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

    const formatBookingTime = (scheduledDate) => scheduledDate
        ? new Date(scheduledDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : 'N/A';

    const renderBookingActions = (booking) => {
        const lastHistoryEntry = booking.chargesHistory?.length > 0
            ? booking.chargesHistory[booking.chargesHistory.length - 1]
            : null;
        const lastAdjusterId = lastHistoryEntry?.updatedBy?._id || lastHistoryEntry?.updatedBy;
        const didILastAdjust = String(lastAdjusterId) === String(profile?._id);

        return (
        <div className="booking-card-actions">
            {/* 1. Request Actions - Provider can accept initial request */}
            {profile?.role === 'provider' && booking.status === 'Requested' && (
                <Button size="sm" variant="primary" onClick={() => updateBookingStatus(booking._id, 'Accepted')}>Accept</Button>
            )}

            {/* 2. Negotiation Accept - Anyone who didn't make the last offer can accept */}
            {booking.status === 'Negotiation' && !didILastAdjust && (
                <Button size="sm" variant="success" onClick={() => updateBookingStatus(booking._id, 'Accepted')}>Accept Offer</Button>
            )}

            {/* 3. Adjust Amount / Counteroffer - available in Accepted or Negotiation (if you didn't make the last offer) */}
            {profile?.role === 'provider' && ['Accepted', 'Negotiation'].includes(booking.status) && !didILastAdjust && (
                <Button size="sm" variant="outline-primary" onClick={() => openAdjustAmountModal(booking, 'adjust')}>
                    Adjust Rate
                </Button>
            )}
            {profile?.role === 'user' && ['Accepted', 'Negotiation'].includes(booking.status) && !didILastAdjust && (
                <Button size="sm" variant="outline-primary" onClick={() => openAdjustAmountModal(booking, 'counteroffer')}>
                    Counteroffer
                </Button>
            )}

            {/* 3. Provider Workflow Actions */}
            {profile?.role === 'provider' && booking.status === 'Accepted' && (
                <Button size="sm" variant="primary" onClick={() => updateBookingStatus(booking._id, 'In-Progress')}>Start</Button>
            )}
            {profile?.role === 'provider' && booking.status === 'In-Progress' && (
                <Button size="sm" variant="success" onClick={() => openCompletionProof(booking)}>Complete Work</Button>
            )}

            {/* 4. Payment Actions - Show when booking is Accepted or Negotiation and not yet paid */}
            {profile?.role === 'user' && ['Accepted', 'Negotiation'].includes(booking.status) && booking.paymentStatus !== 'Paid' && (
                <Button size="sm" variant="warning" onClick={() => startSafepayCheckout(booking._id)} disabled={payingBookingId === booking._id}>
                    Pay Now
                </Button>
            )}
            {isAdmin && booking.status === 'Completed' && booking.paymentStatus === 'Paid' && booking.customerCompletionConfirmed && (
                <Button size="sm" variant="success" onClick={() => releaseBookingPayment(booking)}>Release Payment</Button>
            )}

            {/* 5. Post-work/Information Actions */}
            {booking.status === 'Accepted' && ['Paid', 'Released'].includes(booking.paymentStatus) && (
                <Button size="sm" variant="outline-primary" onClick={() => openChat(booking)}><FiMessageCircle className="me-1" />Chat</Button>
            )}
            {booking.address?.mapUrl && ['Requested', 'Negotiation', 'Accepted', 'In-Progress'].includes(booking.status) && (
                <Button as="a" href={booking.address.mapUrl} target="_blank" rel="noreferrer" size="sm" variant="outline-success">
                    <FiMapPin className="me-1" /> Map
                </Button>
            )}
            {booking.problemPhoto && (
                <Button size="sm" variant="outline-secondary" onClick={() => openProblemPhoto(booking.problemPhoto, 'Problem Picture')}>
                    <FiImage className="me-1" /> Photo
                </Button>
            )}
            {booking.completionPhoto && (
                <Button size="sm" variant="outline-info" onClick={() => openProblemPhoto(booking.completionPhoto, 'Completion Proof')}>
                    <FiImage className="me-1" /> Proof
                </Button>
            )}

            {/* 6. User Specific Actions */}
            {profile?.role === 'user' && booking.status === 'Completed' && booking.completionPhoto && !booking.customerCompletionConfirmed && (
                <Button size="sm" variant="success" onClick={() => confirmCustomerCompletion(booking._id)}>Work Completed</Button>
            )}
            {profile?.role === 'user' && ['Requested', 'Negotiation'].includes(booking.status) && (
                <Button size="sm" variant="outline-danger" onClick={() => deleteBookingRequest(booking._id)}><FiTrash2 className="me-1" /> Decline</Button>
            )}
            {profile?.role === 'user' && booking.providerId?._id && booking.status === 'Completed' && (
                <Button size="sm" variant="outline-danger" onClick={() => navigate('/complain', { state: { providerId: booking.providerId._id, providerName: booking.providerId.name, bookingId: booking._id, serviceCategory: booking.serviceCategory } })}>
                    <FiAlertTriangle className="me-1" /> Complain
                </Button>
            )}
            {profile?.role === 'user' && booking.status === 'Completed' && booking.customerCompletionConfirmed && !booking.hasReview && (
                <Button size="sm" variant="outline-warning" onClick={() => openReview(booking)}><FiStar className="me-1" /> Review</Button>
            )}

            {/* 7. Provider Specific Decline */}
            {profile?.role === 'provider' && ['Requested', 'Negotiation'].includes(booking.status) && (
                <Button size="sm" variant="outline-danger" onClick={() => deleteBookingRequest(booking._id)}><FiTrash2 className="me-1" /> Decline</Button>
            )}

            {/* Status Badges */}
            {profile?.role === 'provider' && ['Accepted', 'Negotiation'].includes(booking.status) && !['Paid', 'Released'].includes(booking.paymentStatus) && (
                <Badge bg="secondary" className="align-self-center">Waiting for payment</Badge>
            )}
            {booking.status === 'Completed' && booking.customerCompletionConfirmed && (
                <Badge bg="success" className="align-self-center">Customer confirmed</Badge>
            )}
            {isAdmin && booking.status === 'Completed' && booking.paymentStatus === 'Paid' && !booking.customerCompletionConfirmed && (
                <Badge bg="secondary" className="align-self-center">Waiting for customer</Badge>
            )}
        </div>
        );
    };

    return (
        <div className="booking-app-screen">
            <div className="booking-phone-shell">
                <header className="booking-mobile-header">
                    <div className="booking-mobile-title">
                        <span>{isAdmin ? 'All Bookings' : 'Bookings'}</span>
                        <small>{filteredBookings.length} of {bookings.length}</small>
                    </div>
                    {isAdmin ? (
                        <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={deleteAllBookings}
                            disabled={deletingAllBookings || bookings.length === 0}
                        >
                            <FiTrash2 />
                        </Button>
                    ) : (
                        <div className="d-flex gap-2 align-items-center">
                            <Button size="sm" variant="outline-primary" onClick={() => window.location.reload()} title="Refresh Bookings" style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiRefreshCw />
                            </Button>
                            <button type="button" className="booking-avatar-button" onClick={() => navigate('/profile')} aria-label="Open profile">
                                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
                            </button>
                        </div>
                    )}
                </header>

                <div className="booking-filter-bar" style={{ display: 'none' }}>
                    {bookingFilters.map((filter) => (
                        <button
                            type="button"
                            key={filter}
                            className={`booking-filter-chip ${bookingFilter === filter ? 'active' : ''}`}
                            onClick={() => setBookingFilter(filter)}
                        >
                            {filter === 'All Types' && <FiFilter />}
                            {filter}
                        </button>
                    ))}
                </div>
                <main className="booking-card-stage">
                        {filteredBookings.length > 0 ? (
                            <div className="bookings-grid">
                                {filteredBookings.map((booking, index) => (
                                    <article 
                                        key={booking._id} 
                                        className="booking-mobile-card enhanced-booking-card"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="booking-card-top">
                                            <div className="booking-service-icon enhanced-service-icon">
                                                {getBookingInitial(booking)}
                                            </div>
                                            <div className="booking-card-copy">
                                                <h3>{getOtherPartyName(booking)}</h3>
                                                <p>{booking.serviceCategory || getBookingType(booking)}</p>
                                                {isAdmin && (
                                                    <small className="admin-booking-info">
                                                        {booking.customerId?.name || 'Customer'} → {booking.providerId?.name || 'Provider'}
                                                    </small>
                                                )}
                                            </div>
                                            <div className="booking-status-wrapper">
                                                <Badge bg={getStatusVariant(booking.status)} className="booking-status-pill enhanced-status-pill">
                                                    {booking.status}
                                                </Badge>
                                                {booking.status === 'Accepted' && booking.paymentStatus === 'Paid' && (
                                                    <span className="payment-ready-badge">
                                                        Ready to Start
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="booking-card-meta enhanced-meta">
                                            <div className="meta-item">
                                                <FiCalendar className="meta-icon" />
                                                <span>{formatBookingDate(booking.scheduledDate)}</span>
                                            </div>
                                        </div>

                                        <div className="booking-card-finance enhanced-finance">
                                            <div className="finance-amount">
                                                <span className="currency-symbol">PKR</span>
                                                <span className="amount-value">{booking.charges || 0}</span>
                                            </div>
                                            <Badge bg={getPaymentBadgeVariant(booking.paymentStatus)} className="payment-badge">
                                                {getPaymentLabel(booking.paymentStatus)}
                                            </Badge>
                                            {booking.chargesHistory && booking.chargesHistory.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="link"
                                                    className="booking-history-button enhanced-history-btn"
                                                    onClick={() => {
                                                        setSelectedBooking(booking);
                                                        setShowAdjustmentHistoryModal(true);
                                                    }}
                                                >
                                                    <FiTrendingUp /> History
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {booking.status === 'Negotiation' && booking.chargesHistory && booking.chargesHistory.length > 0 && (
                                            <div className="negotiation-reason alert alert-warning p-2 mt-2 mb-0" style={{ fontSize: '0.85rem', borderRadius: '8px' }}>
                                                <strong>Offer Reason:</strong> {booking.chargesHistory[booking.chargesHistory.length - 1].reason}
                                            </div>
                                        )}

                                        <div className="booking-actions-enhanced">
                                            {renderBookingActions(booking)}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="booking-empty-state enhanced-empty-state">
                                <div className="empty-state-icon">
                                    <FiCalendar />
                                </div>
                                <h3>No bookings yet.</h3>
                                <p>{bookingFilter === 'All Types' ? 'Your bookings will appear here once you start booking services.' : `No ${bookingFilter.toLowerCase()} found.`}</p>
                                {bookingFilter === 'All Types' && (
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={() => navigate('/providers')}
                                        className="explore-btn"
                                    >
                                        <FiSearch /> Explore Providers
                                    </Button>
                                )}
                            </div>
                        )}
                </main>

            </div>

            <Modal show={showReleaseModal} onHide={closeReleaseModal} centered className="enhanced-modal">
                <Modal.Header closeButton className="modal-header-enhanced">
                    <Modal.Title className="modal-title-enhanced">
                        Release Payment
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitReleasePayment}>
                    <Modal.Body className="modal-body-enhanced">
                        <div className="payment-info-banner">
                            <div>
                                <strong>Payment will be credited to {selectedBooking?.providerId?.name || 'the provider'}'s sandbox account.</strong>
                                <p className="text-muted small mb-0">Amount: PKR {selectedBooking?.charges || 0}</p>
                            </div>
                        </div>
                        <Form.Group className="form-group-enhanced">
                            <Form.Label className="form-label-enhanced">
                                Provider account number
                            </Form.Label>
                            <Form.Control
                                value={providerAccountNumber}
                                onChange={(e) => setProviderAccountNumber(e.target.value)}
                                placeholder="Account number or IBAN"
                                minLength={6}
                                maxLength={34}
                                required
                                autoFocus
                                className="form-control-enhanced"
                            />
                            <Form.Text className="form-text-enhanced">
                                Saved provider account is used for the sandbox release. Older providers can be initialized here.
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="modal-footer-enhanced">
                        <Button variant="outline-secondary" onClick={closeReleaseModal} disabled={releasingPayment} className="btn-cancel">
                            Cancel
                        </Button>
                        <Button type="submit" variant="success" disabled={releasingPayment || !providerAccountNumber.trim()} className="btn-confirm">
                            {releasingPayment ? 'Releasing...' : 'Release Payment'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showChatModal} onHide={() => setShowChatModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Chat for {selectedBooking?.serviceCategory}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="border rounded p-3 mb-3 bg-light" style={{ minHeight: '280px', maxHeight: '360px', overflowY: 'auto' }}>
                        {messages.length > 0 ? messages.map((item) => {
                            const isMine = item.senderId?.toString() === profile?._id?.toString();
                            return (
                                <div key={item._id} className={`d-flex mb-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                                    <div className={`p-2 rounded ${isMine ? 'bg-primary text-white' : 'bg-white border'}`} style={{ maxWidth: '75%' }}>
                                        <div className="small fw-semibold mb-1">{getMessageSenderName(item)}</div>
                                        {item.message && <div>{item.message}</div>}
                                        {item.audioUrl && (
                                            <audio
                                                controls
                                                controlsList="nodownload noplaybackrate"
                                                disablePictureInPicture
                                                onContextMenu={(e) => e.preventDefault()}
                                                src={item.audioUrl}
                                                className="chat-audio-player mt-2"
                                            >
                                                Your browser does not support audio playback.
                                            </audio>
                                        )}
                                        <div className={`small mt-1 ${isMine ? 'text-white-50' : 'text-muted'}`}>
                                            {item.pending ? 'Sending...' : item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center text-muted py-5">No messages yet. Start the negotiation.</div>
                        )}
                    </div>
                    <Form onSubmit={submitChatMessage}>
                        <div className="d-flex align-items-center gap-2">
                            {isRecording ? (
                                <div className="d-flex align-items-center flex-grow-1 bg-light border rounded p-2 text-danger">
                                    <div className="spinner-grow spinner-grow-sm me-2" role="status">
                                        <span className="visually-hidden">Recording...</span>
                                    </div>
                                    <span className="flex-grow-1">Recording...</span>
                                    <Button variant="outline-secondary" size="sm" onClick={cancelRecording} className="me-2" title="Cancel">
                                        <FiX />
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={stopRecordingAndSend} title="Send Voice Message">
                                        <FiSend />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Form.Control
                                        type="text"
                                        placeholder="Type your message..."
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        disabled={sendingMessage}
                                    />
                                    {chatMessage.trim() ? (
                                        <Button type="submit" variant="primary" disabled={sendingMessage}>
                                            <FiSend />
                                        </Button>
                                    ) : (
                                        <Button variant="outline-danger" onClick={startRecording} disabled={sendingMessage} title="Record Voice Message">
                                            <FiMic />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal show={showPhotoModal} onHide={() => setShowPhotoModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{selectedPhotoTitle}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPhoto ? (
                        <img src={selectedPhoto} alt={selectedPhotoTitle} className="img-fluid rounded w-100" />
                    ) : (
                        <div className="text-center text-muted py-5">No picture available.</div>
                    )}
                </Modal.Body>
            </Modal>

            <Modal show={showCompletionModal} onHide={closeCompletionProof} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Submit Completion Proof</Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitCompletionProof}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Completion photo</Form.Label>
                            <Form.Control type="file" accept="image/*" onChange={handleCompletionPhotoChange} required />
                            <Form.Text className="text-muted">
                                Upload a clear photo showing the completed work for admin review.
                            </Form.Text>
                        </Form.Group>
                        {completionPreview && (
                            <div className="border rounded p-2 bg-white">
                                <img src={completionPreview} alt="Completion preview" className="img-fluid rounded w-100" style={{ maxHeight: '260px', objectFit: 'cover' }} />
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline-secondary" onClick={closeCompletionProof}>Cancel</Button>
                        <Button type="submit" variant="success" disabled={submittingCompletion || !completionPhoto}>
                            {submittingCompletion ? 'Submitting...' : 'Submit for Review'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Rate Provider</Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitReview}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Rating</Form.Label>
                            <Form.Select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}>
                                <option value="5">5 - Excellent</option>
                                <option value="4">4 - Good</option>
                                <option value="3">3 - Average</option>
                                <option value="2">2 - Poor</option>
                                <option value="1">1 - Bad</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Comment</Form.Label>
                            <Form.Control as="textarea" rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline-secondary" onClick={() => setShowReviewModal(false)}>Cancel</Button>
                        <Button type="submit" variant="warning" disabled={submittingReview}>
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showAdjustAmountModal} onHide={closeAdjustAmountModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Adjust Service Amount</Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitAdjustAmount}>
                    <Modal.Body>
                        <p className="text-muted mb-3">
                            Current amount: <strong>PKR {selectedBooking?.charges || 0}</strong>
                        </p>
                        <Form.Group className="mb-3">
                            <Form.Label>New Amount</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                step="1"
                                value={adjustAmountForm.newAmount}
                                onChange={(e) => setAdjustAmountForm({ ...adjustAmountForm, newAmount: e.target.value })}
                                placeholder="Enter new amount"
                                required
                                autoFocus
                            />
                            <Form.Text className="text-muted">
                                Enter the adjusted amount based on the problem assessment.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Reason for Adjustment (Select one)</Form.Label>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                                {['Extra Effort Required', 'Additional Material Required', 'Completed Early', 'Unforeseen Issues'].map((reason) => (
                                    <Button
                                        key={reason}
                                        variant={adjustAmountForm.reason === reason ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setAdjustAmountForm({ ...adjustAmountForm, reason })}
                                    >
                                        {reason}
                                    </Button>
                                ))}
                            </div>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline-secondary" onClick={closeAdjustAmountModal} disabled={adjustingAmount}>Cancel</Button>
                        <Button type="submit" variant="info" disabled={adjustingAmount || !adjustAmountForm.newAmount}>
                            {adjustingAmount ? 'Adjusting...' : 'Update Amount'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showAdjustmentHistoryModal} onHide={() => setShowAdjustmentHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Amount Adjustment History</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedBooking?.chargesHistory && selectedBooking.chargesHistory.length > 0 ? (
                        <div className="adjustment-history">
                            {selectedBooking.chargesHistory.map((history, index) => (
                                <div key={index} className="border-bottom pb-3 mb-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <small className="text-muted">Previous Amount</small>
                                            <div className="fw-semibold">PKR {history.previousAmount || 0}</div>
                                        </div>
                                        <div className="col-md-6">
                                            <small className="text-muted">New Amount</small>
                                            <div className="fw-semibold text-success">PKR {history.newAmount}</div>
                                        </div>
                                    </div>
                                    {history.reason && (
                                        <div className="mt-2">
                                            <small className="text-muted">Reason</small>
                                            <div className="small">{history.reason}</div>
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-2">
                                        {history.updatedAt ? new Date(history.updatedAt).toLocaleString() : 'N/A'}
                                    </small>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted py-4">No adjustment history available.</div>
                    )}
                </Modal.Body>
            </Modal>

            <ToastContainer position="bottom-end" className="p-3">
                <Toast bg={toast.type} show={toast.show} onClose={() => setToast({ ...toast, show: false })} delay={3500} autohide>
                    <Toast.Body className="text-white">{toast.message}</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    )
}

export default MyBookings
