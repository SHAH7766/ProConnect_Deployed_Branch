import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Alert, Badge, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCreditCard, FiMessageCircle, FiUser, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const getChatSeenKey = (userId, bookingId) => `chatLastSeen:${userId}:${bookingId}`;

const formatCnic = (cnic) => {
    if (!cnic || cnic.length !== 13) return cnic;
    return `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12)}`;
};

const Profile = () => {
    const [data, setData] = useState(null);
    const [activity, setActivity] = useState(null);
    const [providerWarnings, setProviderWarnings] = useState([]);
    const [newChatMessages, setNewChatMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    const baseURL = API_BASE_URL;

    const isProfileIncomplete = data && data.role === 'provider' && (
        !data.category || !data.experience || !data.charges || !data.sandboxBankAccount?.accountNumber
    );


    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get(`${baseURL}/api/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data.profile);
            setActivity(res.data.activity);
            setProviderWarnings(res.data.providerWarnings || []);
        } catch (err) {
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [baseURL, token]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useAutoRefresh(fetchProfile, 30000);

    useEffect(() => {
        if (!data?._id) return;

        fetchLatestChatMessages(data._id);
        const intervalId = setInterval(() => {
            fetchLatestChatMessages(data._id);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [data?._id]);

    const fetchLatestChatMessages = async (userId) => {
        try {
            const { data } = await axios.get(`${baseURL}/api/bookings/chat/latest`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const unreadMessages = data.filter((item) => {
                const lastSeen = localStorage.getItem(getChatSeenKey(userId, item.bookingId));
                return !lastSeen || new Date(item.createdAt).getTime() > new Date(lastSeen).getTime();
            });

            setNewChatMessages(unreadMessages);
        } catch (err) {
            console.error("Chat notification fetch error:", err);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    const memberSince = data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';
    const activityStats = activity || {
        totalRequests: 0,
        ongoingRequests: 0,
        completedRequests: 0,
        cancelledRequests: 0,
        totalPayment: 0,
        pendingPayment: 0
    };
    const sandboxAccount = data?.sandboxBankAccount || {};

    return (
        <Container className="py-5">
            {isProfileIncomplete && (
                <div style={{ backgroundColor: '#ffc107', color: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                    <strong>Please complete your profile information to explore all features.</strong>
                    <Button variant="link" style={{ color: '#fff', marginLeft: '10px' }} onClick={() => navigate('/edit-profile')}>Complete Now</Button>
                </div>
            )}
            <Row className="g-4">
                <Col lg={4}>
                    <div className="glass-card h-100">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <div className="provider-avatar shadow-sm mb-3">
                                    {data?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <h3 className="fw-bold mb-1">{data?.name}</h3>
                                <p className="text-muted mb-0">{data?.email}</p>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-2">
                                <Badge bg={data?.role === 'admin' ? 'danger' : data?.role === 'provider' ? 'success' : 'primary'}>
                                    {(data?.role || 'user').toUpperCase()}
                                </Badge>
                                <Button size="sm" variant="outline-primary" onClick={() => window.location.reload()} title="Refresh Profile" style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiRefreshCw />
                                </Button>
                            </div>
                        </div>

                        <div className="border-top pt-3">
                            <p className="mb-2"><strong>Account type:</strong> {data?.role || 'customer'}</p>
                            {data?.phone && <p className="mb-2"><strong>Phone:</strong> {data.phone}</p>}
                            {data?.cnic && <p className="mb-2"><strong>CNIC:</strong> {formatCnic(data.cnic)}</p>}
                            <p className="mb-2"><strong>Total requests:</strong> {activityStats.totalRequests}</p>
                            <p className="mb-0"><strong>Member since:</strong> {memberSince}</p>
                        </div>
                    </div>
                </Col>

                <Col lg={8}>
                    {newChatMessages.length > 0 && (
                        <Alert variant="primary" className="mb-4 shadow-sm chat-message-pop">
                            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                <div>
                                    <h5 className="fw-bold mb-2 d-flex align-items-center gap-2">
                                        <FiMessageCircle />
                                        New Chat Message
                                    </h5>
                                    <p className="mb-1">
                                        {newChatMessages[0].otherParty} sent a message about {newChatMessages[0].serviceCategory}.
                                    </p>
                                    <div className="small text-muted">
                                        "{newChatMessages[0].message}"
                                    </div>
                                </div>
                                <Button variant="primary" onClick={() => navigate('/my-bookings')}>
                                    Open Chat
                                </Button>
                            </div>
                        </Alert>
                    )}

                    {data?.role === 'provider' && providerWarnings.length > 0 && (
                        <Alert variant="warning" className="mb-4">
                            <h5 className="fw-bold mb-2">Provider Warning</h5>
                            <p className="mb-2">
                                {providerWarnings.length} active complaint{providerWarnings.length === 1 ? '' : 's'} filed against your account.
                            </p>
                            {providerWarnings.slice(0, 3).map((warning) => (
                                <div key={warning._id} className="small border-top pt-2 mt-2">
                                    <strong>{warning.TypeOfComplaint}</strong>: {warning.message}
                                    <div className="text-muted">
                                        By {warning.customerId?.name || 'Customer'} - {warning.status.replace('_', ' ')}
                                    </div>
                                </div>
                            ))}
                        </Alert>
                    )}

                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <div className="glass-card text-center h-100">
                                <FiUser className="text-primary mb-2" size={28} />
                                <h3 className="fw-bold">{activityStats.ongoingRequests}</h3>
                                <p className="text-muted mb-0">Ongoing Req</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="glass-card text-center h-100">
                                <FiCheckCircle className="text-success mb-2" size={28} />
                                <h3 className="fw-bold">{activityStats.completedRequests}</h3>
                                <p className="text-muted mb-0">Completed Req</p>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="glass-card text-center h-100">
                                <FiXCircle className="text-danger mb-2" size={28} />
                                <h3 className="fw-bold">{activityStats.cancelledRequests}</h3>
                                <p className="text-muted mb-0">Cancelled Req</p>
                            </div>
                        </Col>
                    </Row>

                    <div className="glass-card">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <FiCreditCard className="text-success" />
                            <h4 className="fw-bold mb-0">Payment Information</h4>
                        </div>
                        <Row>
                            <Col sm={6}>
                                <p className="text-muted mb-1">{data?.role === 'provider' ? 'Released earnings' : 'Total payment made'}</p>
                                <h4 className="fw-bold">Rs. {activityStats.totalPayment}</h4>
                            </Col>
                            <Col sm={6}>
                                <p className="text-muted mb-1">{data?.role === 'provider' ? 'Held by platform' : 'Pending payment'}</p>
                                <h4 className="fw-bold">Rs. {activityStats.pendingPayment}</h4>
                            </Col>
                        </Row>
                        {data?.role === 'provider' && (
                            <div className="border-top mt-3 pt-3">
                                <Row className="g-3">
                                    <Col md={6}>
                                        <p className="text-muted mb-1">Dummy account number</p>
                                        <h5 className="fw-bold mb-0">{sandboxAccount.accountNumber || 'Not set'}</h5>
                                    </Col>
                                    <Col md={6}>
                                        <p className="text-muted mb-1">Sandbox balance</p>
                                        <h5 className="fw-bold mb-0">{sandboxAccount.currency || 'PKR'} {sandboxAccount.balance || 0}</h5>
                                    </Col>
                                    <Col md={6}>
                                        <p className="text-muted mb-1">Account title</p>
                                        <p className="mb-0">{sandboxAccount.accountTitle || data?.name || 'Provider'}</p>
                                    </Col>
                                    <Col md={6}>
                                        <p className="text-muted mb-1">Bank</p>
                                        <p className="mb-0">{sandboxAccount.bankName || 'ProConnect Sandbox Bank'}</p>
                                    </Col>
                                </Row>
                                <Button variant="outline-success" className="mt-3" onClick={() => navigate('/edit-profile')}>
                                    Manage Account
                                </Button>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </Container>
    )
}

export default Profile
