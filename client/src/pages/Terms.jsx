import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';

const Terms = () => {
  return (
    <div className="auth-page-wrapper" style={{ minHeight: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}>
      <Container style={{ maxWidth: '900px' }}>
        <div className="auth-card p-4" style={{ maxWidth: '100%' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <FiFileText size={28} className="text-primary" />
            <h2 className="fw-bold mb-0">Terms of Service</h2>
          </div>
          <p className="text-muted mb-4">Last updated: January 2026</p>

          <h5 className="fw-bold mt-4">1. Acceptance of Terms</h5>
          <p>By creating an account and using ProConnect, you agree to these terms of service. If you do not agree, please do not use our platform.</p>

          <h5 className="fw-bold mt-4">2. Service Description</h5>
          <p>ProConnect connects customers with verified service providers for home maintenance and repair services including plumbing and electrical work. We facilitate bookings, payments, and communication between parties.</p>

          <h5 className="fw-bold mt-4">3. User Responsibilities</h5>
          <p>Users must provide accurate information during registration. Customers agree to pay for services booked through the platform. Providers agree to deliver services professionally and as described.</p>

          <h5 className="fw-bold mt-4">4. Payment Terms</h5>
          <p>Payments are processed through Safepay and held securely until work is confirmed complete by the customer. Funds are then released to the provider. All payments are in PKR.</p>

          <h5 className="fw-bold mt-4">5. Dispute Resolution</h5>
          <p>If you have a dispute with a service provider, please file a complaint through our platform. We will review and mediate to reach a fair resolution for both parties.</p>

          <Link to="/" className="btn btn-outline-primary mt-4">
            <FiArrowLeft className="me-2" />Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Terms;
