import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiGlobe, FiAtSign } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';

const Footer = () => {
  const [ref, isInView, variants] = useScrollReveal();

  return (
    <motion.footer
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className="footer-minimal"
    >
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
            <button className="btn btn-link text-muted p-0" style={{ transition: 'color 0.2s, transform 0.2s' }}><FiGlobe size={20} /></button>
            <button className="btn btn-link text-muted p-0" style={{ transition: 'color 0.2s, transform 0.2s' }}><FiAtSign size={20} /></button>
          </div>
        </div>
      </Container>
    </motion.footer>
  );
};

export default Footer;
