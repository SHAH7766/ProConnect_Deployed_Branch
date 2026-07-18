import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    Toast,
    ToastContainer
} from 'react-bootstrap';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ResetPassword = () => {
    const { token: routeToken } = useParams();
    const [searchParams] = useSearchParams();
    const token = routeToken || searchParams.get('token');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'danger'
    });

    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        upper: false,
        number: false,
        special: false
    });

    const navigate = useNavigate();
    const baseURL = API_BASE_URL;

    // ✅ FIXED: Reference 'password' state directly, not 'formData'
    useEffect(() => {
        setPasswordCriteria({
            length: password.length >= 7,
            upper: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&]/.test(password),
        });
    }, [password]);

    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ FIXED: Validation logic belongs inside the submit handler
        if (!isPasswordValid) {
            return setToast({
                show: true,
                message: "Please meet all password requirements",
                type: "danger"
            });
        }

        if (!token) {
            return setToast({ show: true, message: "Invalid or expired link", type: "danger" });
        }

        try {
            setLoading(true);
            const { data } = await axios.post(`${baseURL}/api/resetpassword`, {
                password,
                token
            });

            if (data && data.success) {
                setToast({
                    show: true,
                    message: "Password reset successfully! Redirecting...",
                    type: "success"
                });
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setToast({
                    show: true,
                    message: data.Message || "Failed to reset password",
                    type: "danger"
                });
            }
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.Message || "Failed to reset password",
                type: "danger"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 76px)' }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={8} lg={5}>
                        <div className="shadow-lg p-4" style={{ borderRadius: '1rem', background: '#fff' }}>
                            <div className="text-center mb-4">
                                <h3 className="fw-bold">Reset Password</h3>
                                <p className="text-muted">Set your new secure password</p>
                            </div>

                            <Form onSubmit={handleSubmit} noValidate>
                                <Form.Group className="mb-3">
                                    <Form.Label>New Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                {/* Password Requirements Display */}
                                <div className="mb-3 p-2 bg-light rounded">
                                    {Object.entries(passwordCriteria).map(([key, val]) => (
                                        <small key={key} className={val ? "text-success d-block" : "text-muted d-block"}>
                                            {val ? "✓" : "○"} {key === 'upper' ? 'One uppercase letter' : 
                                                               key === 'length' ? 'At least 7 characters' : 
                                                               key === 'number' ? 'One number' : 
                                                               'One special character (@$!%*?&)'}
                                        </small>
                                    ))}
                                </div>

                                <Button type="submit" className="w-100 py-2" disabled={loading}>
                                    {loading ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</>
                                    ) : "Update Password"}
                                </Button>
                            </Form>
                        </div>
                    </Col>
                </Row>

                <ToastContainer position="bottom-end" className="p-3">
                    <Toast
                        bg={toast.type}
                        show={toast.show}
                        onClose={() => setToast({ ...toast, show: false })}
                        delay={3000}
                        autohide
                    >
                        <Toast.Body className={toast.type === 'success' ? "text-white" : "text-white"}>
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                </ToastContainer>
            </Container>
        </div>
    );
};

export default ResetPassword;
