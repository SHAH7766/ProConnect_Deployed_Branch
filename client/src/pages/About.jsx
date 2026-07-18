import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const About = () => {
  const [headerRef, headerVisible] = useScrollAnimation();
  const [contentRef1, contentVisible1] = useScrollAnimation();
  const [contentRef2, contentVisible2] = useScrollAnimation();

  return (
    <div className="pt-5 mt-5">
        <section className="hero-section-modern text-center pb-5">
          <Container>
            <div ref={headerRef} className={`scroll-animate ${headerVisible ? 'is-visible' : ''}`}>
              <h1 className="hero-title-modern mb-3">About <em>ProConnect</em></h1>
              <p className="hero-subtitle-modern mx-auto">
                We're on a mission to revolutionize how people find and hire local professionals.
              </p>
            </div>
          </Container>
        </section>

        <section className="categories-section pt-0">
          <Container>
            <Row className="align-items-center mb-5 pb-5">
              <Col lg={6} className="mb-4 mb-lg-0">
                <div ref={contentRef1} className={`hero-image-wrapper scroll-animate slide-right ${contentVisible1 ? 'is-visible' : ''}`}>
                  <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop" alt="Our Team" className="hero-image" />
                </div>
              </Col>
              <Col lg={6} className="ps-lg-5">
                <div ref={contentRef1} className={`scroll-animate slide-left delay-100 ${contentVisible1 ? 'is-visible' : ''}`}>
                  <h2 className="trust-title text-start mb-4">Our Story</h2>
                  <p className="mb-3">
                    Founded in 2024, ProConnect started with a simple observation: finding reliable, high-quality professionals for home and business projects was too difficult and stressful.
                  </p>
                  <p>
                    We built a platform that removes the friction, implementing rigorous vetting, secure escrow payments, and an AI-driven matching system to ensure that every connection made on ProConnect is a successful one.
                  </p>
                </div>
              </Col>
            </Row>

            <Row className="align-items-center text-center py-5">
              <Col lg={8} className="mx-auto">
                <div ref={contentRef2} className={`scroll-animate ${contentVisible2 ? 'is-visible' : ''}`}>
                  <h2 className="trust-title mb-4">Our Core Values</h2>
                  <Row className="g-4 mt-2">
                    <Col md={4}>
                      <h4>Trust</h4>
                      <p className="text-muted">We verify every professional.</p>
                    </Col>
                    <Col md={4}>
                      <h4>Quality</h4>
                      <p className="text-muted">We demand excellence.</p>
                    </Col>
                    <Col md={4}>
                      <h4>Innovation</h4>
                      <p className="text-muted">We build smarter tools.</p>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </div>
  );
};

export default About;
