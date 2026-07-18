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
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ForgotPasswordForm = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState({ link: false, otp: false, resending: false });
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false, upper: false, number: false, special: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 7,
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const baseURL = API_BASE_URL;
  // --- HANDLER: SEND RESET LINK ---
  const handleSendLink = async () => {
    if (!email) return setToast({ show: true, message: "Email is required", type: "danger" });
    try {
      setLoading({ ...loading, link: true });
      const { data } = await axios.post(`${baseURL}/api/forgotpassword`, { email });
      if (data.success) {
        setToast({ show: true, message: "Reset link sent to your email!", type: "success" });
      }
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.Message || "Failed to send link", type: "danger" });
    } finally {
      setLoading({ ...loading, link: false });
    }
  };

  // --- HANDLER: REQUEST/RESEND OTP ---
  const handleRequestOtp = async (isResend = false) => {
    if (!email) return setToast({ show: true, message: "Email is required", type: "danger" });

    try {
      // Use 'resending' loader if it's a resend request to keep the main button clean
      setLoading({ ...loading, [isResend ? 'resending' : 'otp']: true });

      const { data } = await axios.post(`${baseURL}/api/sendotp`, { email });

      if (data.success) {
        setToast({
          show: true,
          message: isResend ? "New OTP sent successfully!" : "OTP sent to your email!",
          type: "success"
        });
        if (!isResend) setStep(2);
      }
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.Message || "Failed to send OTP", type: "danger" });
    } finally {
      setLoading({ ...loading, otp: false, resending: false });
    }
  };

  // --- HANDLER: VERIFY & UPDATE ---
  const handleVerifyAndUpdate = async (e) => {
    e.preventDefault();
    if (!otp) return setToast({ show: true, message: "OTP is required", type: "danger" });
    if (!isPasswordValid) return setToast({ show: true, message: "Check password criteria", type: "danger" });

    try {
      setLoading({ ...loading, otp: true });
      const { data } = await axios.post(`${baseURL}/api/verifyotp`, {
        email,
        otp,
        password
      });

      if (data.success) {
        setToast({ show: true, message: "Password updated successfully!", type: "success" });
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.Message || "OTP may be expired or invalid",
        type: "danger"
      });
    } finally {
      setLoading({ ...loading, otp: false });
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 76px)' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <div className="shadow-lg p-4" style={{ borderRadius: '1rem', background: '#fff' }}>

              {/* STEP 1: METHOD SELECTION */}
              {step === 1 && (
                <>
                  <div className="text-center mb-4">
                    <h3 className="fw-bold text-dark">Reset Password</h3>
                    <p className="text-muted" style={{ color: '#6c757d' }}>Choose how you want to recover your account</p>
                  </div>
                  <Form>
                    <Form.Group className="mb-4">
                      <Form.Control type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Form.Group>
                    <div className="d-grid gap-3">
                      <Button variant="primary" onClick={handleSendLink} disabled={loading.link || loading.otp}>
                        {loading.link ? "Sending Link..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </Form>
                </>
              )}

              {/* STEP 2: OTP & PASSWORD ENTRY */}
              {step === 2 && (
                <>
                  <div className="text-center mb-4">
                    <h3 className="fw-bold">OTP Verification</h3>
                    <p className="text-muted">Enter the code and set your new password</p>
                  </div>
                  <Form onSubmit={handleVerifyAndUpdate}>
                    <Form.Group className="mb-3">
                      <Form.Label>Verification Code</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                      />
                      {/* RESEND BUTTON */}
                      <div className="text-end mt-1">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={() => handleRequestOtp(true)}
                          disabled={loading.resending}
                        >
                          {loading.resending ? "Sending..." : "Resend OTP?"}
                        </Button>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="New password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <div className="mb-3 p-2 bg-light rounded shadow-sm">
                      {Object.entries(passwordCriteria).map(([key, val]) => (
                        <small key={key} className={val ? "text-success d-block" : "text-muted d-block"}>
                          {val ? "✓" : "○"} {
                            key === 'upper' ? 'One uppercase letter' :
                              key === 'length' ? 'Min 7 characters' :
                                key === 'number' ? 'One number' :
                                  'One special character'
                          }
                        </small>
                      ))}
                    </div>

                    <Button type="submit" className="w-100 py-2 mb-2" disabled={loading.otp || !isPasswordValid}>
                      {loading.otp ? "Verifying..." : "Verify & Update Password"}
                    </Button>

                    <Button variant="link" className="w-100 text-muted small" onClick={() => setStep(1)}>
                      Change reset method
                    </Button>
                  </Form>
                </>
              )}

            </div>
          </Col>
        </Row>

        <ToastContainer position="bottom-end" className="p-3">
          <Toast bg={toast.type} show={toast.show} autohide delay={4000} onClose={() => setToast({ ...toast, show: false })}>
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        </ToastContainer>
      </Container>
    </div>
  );
};

export default ForgotPasswordForm;
