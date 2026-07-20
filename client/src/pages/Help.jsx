import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiHelpCircle } from 'react-icons/fi';

const Help = () => {
  return (
    <div className="auth-page-wrapper" style={{ minHeight: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}>
      <Container style={{ maxWidth: '900px' }}>
        <div className="auth-card p-4" style={{ maxWidth: '100%' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <FiHelpCircle size={28} className="text-primary" />
            <h2 className="fw-bold mb-0">Help Center</h2>
          </div>

          <h5 className="fw-bold mt-4">How do I book a service?</h5>
          <p>Browse providers by category (Plumber or Electronics), view their profiles and reviews, and click "Book Now" to schedule a service. Provide your location and a description of the work needed.</p>

          <h5 className="fw-bold mt-4">How does payment work?</h5>
          <p>After a provider accepts your booking, you can pay securely through Safepay. Payment is held by the platform and released to the provider only after you confirm the work is completed.</p>

          <h5 className="fw-bold mt-4">Can I negotiate the price?</h5>
          <p>Yes. After the provider inspects the work, they can adjust the rate. You can then either accept the new rate, make a counteroffer, or pay directly. Both parties can negotiate until an agreement is reached.</p>

          <h5 className="fw-bold mt-4">How do I become a provider?</h5>
          <p>Register as a provider, complete your profile with category, experience, charges, and bank account details. Your account will be activated by admin after review.</p>

          <h5 className="fw-bold mt-4">Contact Support</h5>
          <p>Email us at <a href="mailto:support@proconnect.com" className="text-primary">support@proconnect.com</a> or visit the <Link to="/contact" className="text-primary">Contact page</Link> for more help.</p>

          <Link to="/" className="btn btn-outline-primary mt-4">
            <FiArrowLeft className="me-2" />Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Help;
