import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Badge, Container, Row, Col, Toast, ToastContainer, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard, FiMail, FiLock, FiPhone, FiRefreshCw, FiBriefcase, FiUser } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';

const getGeneratedSandboxAccountNumber = (providerId = '') => providerId
    ? `SBX-${providerId.toString().slice(-12).toUpperCase()}`
    : '';

const EditProfile = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingContact, setSavingContact] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [contactForm, setContactForm] = useState({
        email: '',
        phone: '',
        cnic: '',
        sandboxBankAccountNumber: '',
        category: '',
        experience: '',
        charges: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    const baseURL = API_BASE_URL;

    useEffect(() => {
        fetchProfile();
    }, [token]);

    const fetchProfile = async () => {
        try {
            const { data } = await axios.get(`${baseURL}/api/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(data.profile);
            setContactForm({
                email: data.profile?.email || '',
                phone: data.profile?.phone || '',
                cnic: data.profile?.cnic || '',
                sandboxBankAccountNumber: data.profile?.sandboxBankAccount?.accountNumber || getGeneratedSandboxAccountNumber(data.profile?._id),
                category: data.profile?.category || '',
                experience: data.profile?.experience || '',
                charges: data.profile?.charges || ''
            });
        } catch (err) {
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    };

    const handleContactChange = (e) => {
        setContactForm({ ...contactForm, [e.target.name]: e.target.value });
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();

        if (contactForm.cnic && contactForm.cnic.trim()) {
            const cnicDigits = contactForm.cnic.replace(/[^0-9]/g, '');
            if (cnicDigits.length !== 13) {
                setToast({ show: true, message: 'CNIC must be exactly 13 digits (e.g. 37405-1234567-1)', type: 'danger' });
                return;
            }
        }

        try {
            setSavingContact(true);
            const { data } = await axios.put(`${baseURL}/api/profile/contact`, contactForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setData((current) => ({
                ...current,
                email: data.profile?.email || contactForm.email,
                phone: data.profile?.phone || contactForm.phone,
                cnic: data.profile?.cnic || contactForm.cnic,
                sandboxBankAccount: data.profile?.sandboxBankAccount || current?.sandboxBankAccount,
                category: data.profile?.category || contactForm.category,
                experience: data.profile?.experience || contactForm.experience,
                charges: data.profile?.charges || contactForm.charges
            }));
            setToast({ show: true, message: data.Message, type: 'success' });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.Message || "Unable to update contact details.",
                type: 'danger'
            });
        } finally {
            setSavingContact(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
        if (!passwordRegex.test(passwordForm.newPassword)) {
            setToast({
                show: true,
                message: "New password needs 7+ chars, uppercase, number, and special character.",
                type: 'danger'
            });
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setToast({ show: true, message: "Passwords do not match.", type: 'danger' });
            return;
        }

        try {
            setSavingPassword(true);
            const { data } = await axios.put(`${baseURL}/api/profile/password`, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setToast({ show: true, message: data.Message, type: 'success' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.Message || "Unable to update password.",
                type: 'danger'
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="auth-page-wrapper">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page-wrapper" style={{ minHeight: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}>
            <Container style={{ maxWidth: '900px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <button className="btn btn-link px-0 fw-semibold text-decoration-none d-flex align-items-center text-primary" onClick={() => navigate('/profile')}>
                        <FiArrowLeft className="me-2" />
                        Back to Profile
                    </button>
                    <button className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center" onClick={() => window.location.reload()} title="Refresh Page" style={{ width: '36px', height: '36px', padding: 0 }}>
                        <FiRefreshCw />
                    </button>
                </div>
                
                <Row className="g-4">
                    <Col md={4}>
                        <div className="auth-card text-center p-4" style={{ maxWidth: '100%' }}>
                            <div className="provider-avatar shadow-sm mb-3 mx-auto" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                                {data?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <h4 className="fw-bold mb-1">{data?.name}</h4>
                            <p className="text-muted mb-2 small">{data?.email}</p>
                            {data?.phone && <p className="text-muted mb-3 small">{data.phone}</p>}
                            <Badge bg={data?.role === 'admin' ? 'danger' : data?.role === 'provider' ? 'success' : 'primary'} className="rounded-pill px-3 py-2">
                                {data?.role || 'user'}
                            </Badge>
                        </div>
                    </Col>

                    <Col md={8}>
                        <div className="auth-card mb-4 p-4" style={{ maxWidth: '100%' }}>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <FiMail className="text-primary fs-5" />
                                <h5 className="fw-bold mb-0">Contact Details</h5>
                            </div>
                            <Form onSubmit={handleContactSubmit}>
                                <div className="auth-input-group mb-3">
                                    <FiMail className="auth-input-icon" />
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="EMAIL ADDRESS"
                                        value={contactForm.email}
                                        onChange={handleContactChange}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group mb-3">
                                    <FiPhone className="auth-input-icon" />
                                    <input
                                        name="phone"
                                        type="tel"
                                        placeholder="PHONE NUMBER"
                                        value={contactForm.phone}
                                        onChange={handleContactChange}
                                    />
                                </div>
                                <div className="auth-input-group mb-4">
                                    <FiUser className="auth-input-icon" />
                                    <input
                                        name="cnic"
                                        type="text"
                                        placeholder="CNIC (e.g. 37405-1234567-1)"
                                        maxLength={15}
                                        value={contactForm.cnic}
                                        onChange={handleContactChange}
                                    />
                                </div>

                                {data?.role === 'provider' && (
                                    <>
                                        <hr className="my-4 text-muted opacity-25" />
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <FiBriefcase className="text-primary fs-5" />
                                            <h5 className="fw-bold mb-0">Professional Details</h5>
                                        </div>
                                        <Row className="g-3 mb-4">
                                            <Col md={12}>
                                                <div className="auth-input-group mb-0">
                                                    <select name="category" value={contactForm.category} onChange={handleContactChange}>
                                                        <option value="">SELECT CATEGORY</option>
                                                        <option value="Electronics">Electronics</option>
                                                        <option value="Plumber">Plumber</option>
                                                    </select>
                                                </div>
                                            </Col>
                                            <Col md={6}>
                                                <div className="auth-input-group mb-0">
                                                    <input name="experience" placeholder="EXPERIENCE (YRS)" value={contactForm.experience} onChange={handleContactChange} />
                                                </div>
                                            </Col>
                                            <Col md={6}>
                                                <div className="auth-input-group mb-0">
                                                    <input type="number" min="0" max="500" name="charges" placeholder="CHARGES (RS)" max={500} value={contactForm.charges} onChange={handleContactChange} />
                                                </div>
                                            </Col>
                                        </Row>

                                        <hr className="my-4 text-muted opacity-25" />
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <FiCreditCard className="text-success fs-5" />
                                            <h5 className="fw-bold mb-0">Sandbox Account</h5>
                                        </div>
                                        <div className="auth-input-group mb-2">
                                            <FiCreditCard className="auth-input-icon" />
                                            <input
                                                name="sandboxBankAccountNumber"
                                                value={contactForm.sandboxBankAccountNumber}
                                                onChange={handleContactChange}
                                                placeholder="SBX-123456789ABC"
                                                minLength={6}
                                                maxLength={34}
                                                required
                                            />
                                        </div>
                                        <p className="text-muted small mb-4 ms-2">
                                            Bank: {data?.sandboxBankAccount?.bankName || 'ProConnect Sandbox Bank'} · Currency: {data?.sandboxBankAccount?.currency || 'PKR'}
                                        </p>
                                    </>
                                )}
                                
                                <button type="submit" className="auth-btn-primary py-2" disabled={savingContact}>
                                    {savingContact ? 'Updating...' : 'Save Changes'}
                                </button>
                            </Form>
                        </div>

                        <div className="auth-card p-4" style={{ maxWidth: '100%' }}>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <FiLock className="text-primary fs-5" />
                                <h5 className="fw-bold mb-0">Security</h5>
                            </div>
                            <Form onSubmit={handlePasswordSubmit}>
                                <div className="auth-input-group mb-3">
                                    <FiLock className="auth-input-icon" />
                                    <input 
                                        name="currentPassword" 
                                        type="password" 
                                        placeholder="CURRENT PASSWORD" 
                                        value={passwordForm.currentPassword} 
                                        onChange={handlePasswordChange} 
                                        required 
                                    />
                                </div>
                                <div className="auth-input-group mb-3">
                                    <FiLock className="auth-input-icon" />
                                    <input 
                                        name="newPassword" 
                                        type="password" 
                                        placeholder="NEW PASSWORD" 
                                        value={passwordForm.newPassword} 
                                        onChange={handlePasswordChange} 
                                        required 
                                    />
                                </div>
                                <div className="auth-input-group mb-4">
                                    <FiLock className="auth-input-icon" />
                                    <input 
                                        name="confirmPassword" 
                                        type="password" 
                                        placeholder="CONFIRM NEW PASSWORD" 
                                        value={passwordForm.confirmPassword} 
                                        onChange={handlePasswordChange} 
                                        required 
                                    />
                                </div>
                                <button type="submit" className="auth-btn-primary py-2" disabled={savingPassword}>
                                    {savingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </Form>
                        </div>
                    </Col>
                </Row>

                <ToastContainer position="bottom-end" className="p-3">
                    <Toast bg={toast.type} show={toast.show} onClose={() => setToast({ ...toast, show: false })} delay={3500} autohide>
                        <Toast.Body className="text-white">{toast.message}</Toast.Body>
                    </Toast>
                </ToastContainer>
            </Container>
        </div>
    )
}

export default EditProfile
