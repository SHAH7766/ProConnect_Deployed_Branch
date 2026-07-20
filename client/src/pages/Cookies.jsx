import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiSettings } from 'react-icons/fi';

const Cookies = () => {
  return (
    <div className="auth-page-wrapper" style={{ minHeight: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}>
      <Container style={{ maxWidth: '900px' }}>
        <div className="auth-card p-4" style={{ maxWidth: '100%' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <FiSettings size={28} className="text-primary" />
            <h2 className="fw-bold mb-0">Cookie Settings</h2>
          </div>
          <p className="text-muted mb-4">Last updated: January 2026</p>

          <h5 className="fw-bold mt-4">What Are Cookies</h5>
          <p>Cookies are small text files stored on your device that help us remember your preferences and improve your experience on ProConnect.</p>

          <h5 className="fw-bold mt-4">How We Use Cookies</h5>
          <p>We use essential cookies for authentication and security. Analytics cookies help us understand how you use our platform so we can improve it. Preference cookies remember your theme selection and language preferences.</p>

          <h5 className="fw-bold mt-4">Managing Cookies</h5>
          <p>You can control cookies through your browser settings. Disabling certain cookies may affect platform functionality, such as staying logged in between sessions.</p>

          <h5 className="fw-bold mt-4">Third-Party Cookies</h5>
          <p>We use Safepay for payment processing, which may set their own cookies during checkout. We do not control these third-party cookies.</p>

          <Link to="/" className="btn btn-outline-primary mt-4">
            <FiArrowLeft className="me-2" />Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Cookies;
