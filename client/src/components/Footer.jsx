import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiGlobe, FiAtSign } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="footer-minimal">
      <Container>
        <div className="footer-minimal-inner">
          <div>
            <Link to="/" className="footer-logo">
              <img src="/logo.jpg" alt="ProConnect Logo" style={{ height: '24px', width: '24px', borderRadius: '50%', marginRight: '8px' }} />
              ProConnect
            </Link>
            <div className="footer-copyright">
              © {new Date().getFullYear()} ProConnect AI. All rights reserved.
            </div>
          </div>
          
          <div className="footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Settings</Link>
            <Link to="/help">Help Center</Link>
          </div>

          <div className="footer-social">
            <button className="btn btn-link text-muted p-0"><FiGlobe size={20} /></button>
            <button className="btn btn-link text-muted p-0"><FiAtSign size={20} /></button>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
