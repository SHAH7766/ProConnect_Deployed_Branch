import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { FiArrowRight, FiZap, FiShield, FiLock, FiClock, FiStar, FiAlertCircle } from 'react-icons/fi';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const Home = () => {
  const role = localStorage.getItem('role');
  const [heroRef, heroVisible] = useScrollAnimation();
  const [trustRef, trustVisible] = useScrollAnimation();
  const [catRef, catVisible] = useScrollAnimation();
  const baseURL = API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const { data } = await axios.get(`${baseURL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(data.profile);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, []);


  return (
    <>
      <section ref={heroRef} className={`hero-section-modern scroll-animate ${heroVisible ? 'is-visible' : ''}`}>
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-5 mb-lg-0 pe-lg-5">
              <div className="pill-badge"><span>New</span>ProConnect AI-Powered Platform</div>
              <h1 className="hero-title-modern">Find Verified Experts for <em>Every Need</em></h1>
              <p className="hero-subtitle-modern">Streamline your home maintenance and professional projects with our AI-vetted database of trusted experts. Fast, secure, and transparent.</p>

              <div className="d-flex gap-3">
                <Button
                    className="btn btn-primary px-4 py-2 rounded-pill fw-semibold"
                    onClick={() => {
                        const token = localStorage.getItem('token');
                        if (token) {
                            navigate('/providers');
                        } else {
                            navigate('/register');
                        }
                    }}
                >
                  Get Started
                </Button>
                <Link to="/services" className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-semibold border-2">
                  View Showcase
                </Link>
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <h3>15k+</h3>
                  <p>Active Experts</p>
                </div>
                <div className="hero-stat">
                  <h3>98%</h3>
                  <p>Success Rate</p>
                </div>
                <div className="hero-stat">
                  <h3>4.9/5</h3>
                  <p>User Rating</p>
                </div>
              </div>
            </Col>

            <Col lg={6}>
              <div className="hero-image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Team collaborating"
                  className="hero-image"
                />
              </div>
            </Col>
          </Row>

          {role === 'user' && (
            <Row className="mt-5 pt-5">
              <Col className="text-center">
                <div className="d-inline-block p-4 rounded-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #edf2f7)', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <p className="text-dark mb-3 small fw-bold text-uppercase">Need assistance with a provider?</p>
                  <Link to="/complain" className="text-decoration-none">
                    <Button variant="outline-danger" className="px-4 py-2 d-flex align-items-center gap-2 mx-auto fw-bold">
                      <FiAlertCircle /> Report a Problem
                    </Button>
                  </Link>
                </div>
              </Col>
            </Row>
          )}
        </Container>
      </section>

      {/* Trust Section */}
      <section ref={trustRef} className={`trust-section scroll-animate ${trustVisible ? 'is-visible' : ''}`}>
        <Container>
          <h2 className="trust-title">Why Businesses Trust ProConnect</h2>
          <p className="trust-subtitle">We bridge the gap between quality and efficiency with our rigorous vetting and AI-assisted workflow tools.</p>
          
          <Row className="g-4 mt-2">
            <Col md={6} lg={3}>
              <div className="trust-card">
                <div className="trust-icon"><FiZap /></div>
                <h4>Instant Matching</h4>
                <p>Our AI algorithm finds the perfect expert for your specific needs in seconds, not hours.</p>
              </div>
            </Col>
            <Col md={6} lg={3}>
              <div className="trust-card">
                <div className="trust-icon"><FiShield /></div>
                <h4>Vetted & Secure</h4>
                <p>Every professional undergoes a multi-step verification process to ensure top-tier quality.</p>
              </div>
            </Col>
            <Col md={6} lg={3}>
              <div className="trust-card">
                <div className="trust-icon"><FiLock /></div>
                <h4>Protected Payments</h4>
                <p>Funds are held in escrow and released only when you are 100% satisfied with the work.</p>
              </div>
            </Col>
            <Col md={6} lg={3}>
              <div className="trust-card">
                <div className="trust-icon"><FiClock /></div>
                <h4>24/7 Support</h4>
                <p>Dedicated success managers available around the clock to assist with your projects.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Categories Section */}
      <section ref={catRef} className={`categories-section scroll-animate ${catVisible ? 'is-visible' : ''}`}>
        <Container>
          <div className="categories-header">
            <div>
              <h2>Popular Service Categories</h2>
              <p className="text-muted mb-0 mt-2">Explore our most requested expertise areas.</p>
            </div>
          </div>
          
          <Row className="g-4 mt-4">
            <Col lg={6}>
              <div className="category-card large hover-lift">
                <img src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=1200&auto=format&fit=crop" alt="Expert Plumbing Services" className="category-img" />
                <div className="category-overlay"></div>
                <div className="category-content">
                  <div className="category-tag">Plumbing</div>
                  <h3>Expert Plumbing Services</h3>
                  <p>Reliable fixes for leaks, installations, and full piping overhauls.</p>
                </div>
              </div>
            </Col>
            <Col lg={6}>
              <Row className="g-4">
                <Col xs={12}>
                  <div className="category-card hover-lift">
                    <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop" alt="Electrical Maintenance" className="category-img" />
                    <div className="category-overlay"></div>
                    <div className="category-content">
                      <h3>Electrical Maintenance</h3>
                      <p>Safe and certified electricians for wiring and repairs.</p>
                    </div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="category-card hover-lift">
                    <img src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=800&auto=format&fit=crop" alt="Appliance Repair" className="category-img" />
                    <div className="category-overlay"></div>
                    <div className="category-content">
                      <h3>Appliance Repair</h3>
                      <p>Quick diagnostics and fixes for your home appliances.</p>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default Home;
