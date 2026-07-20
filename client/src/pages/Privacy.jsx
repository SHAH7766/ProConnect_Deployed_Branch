import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShield } from 'react-icons/fi';

const Privacy = () => {
  return (
    <div className="auth-page-wrapper" style={{ minHeight: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}>
      <Container style={{ maxWidth: '900px' }}>
        <div className="auth-card p-4" style={{ maxWidth: '100%' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <FiShield size={28} className="text-primary" />
            <h2 className="fw-bold mb-0">Privacy Policy</h2>
          </div>
          <p className="text-muted mb-4">Last updated: January 2026</p>

          <h5 className="fw-bold mt-4">1. Information We Collect</h5>
          <p>We collect information you provide when creating an account, including your name, email address, phone number, and CNIC. When you book a service, we also collect your location address and service details.</p>

          <h5 className="fw-bold mt-4">2. How We Use Your Information</h5>
          <p>Your information is used to facilitate service bookings, process payments through Safepay, enable communication between customers and providers, and improve our platform experience.</p>

          <h5 className="fw-bold mt-4">3. Data Protection</h5>
          <p>We implement industry-standard security measures to protect your personal data. Payment processing is handled securely through Safepay, and we do not store full payment card details on our servers.</p>

          <h5 className="fw-bold mt-4">4. Information Sharing</h5>
          <p>We share necessary information with service providers only when you book a service. We do not sell your personal information to third parties.</p>

          <h5 className="fw-bold mt-4">5. Your Rights</h5>
          <p>You have the right to access, update, or delete your personal information at any time through your profile settings. Contact us at support@proconnect.com for assistance.</p>

          <Link to="/" className="btn btn-outline-primary mt-4">
            <FiArrowLeft className="me-2" />Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Privacy;
