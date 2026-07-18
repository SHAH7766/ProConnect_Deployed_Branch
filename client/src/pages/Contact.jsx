import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const Contact = () => {
  const [headerRef, headerVisible] = useScrollAnimation();
  const [formRef, formVisible] = useScrollAnimation();
  const [infoRef, infoVisible] = useScrollAnimation();

  return (
    <div className="pt-5 mt-5">
        <section className="hero-section-modern text-center pb-5">
          <Container>
            <div ref={headerRef} className={`scroll-animate ${headerVisible ? 'is-visible' : ''}`}>
              <h1 className="hero-title-modern mb-3">Get in <em>Touch</em></h1>
              <p className="hero-subtitle-modern mx-auto">
                Have questions or need assistance? Our support team is here to help.
              </p>
            </div>
          </Container>
        </section>

        <section className="categories-section pt-0">
          <Container>
            <Row className="g-5">
              <Col lg={7}>
                <div ref={formRef} className={`trust-card scroll-animate slide-right ${formVisible ? 'is-visible' : ''}`}>
                  <h3 className="mb-4">Send us a Message</h3>
                  <Form>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>First Name</Form.Label>
                          <Form.Control type="text" placeholder="John" className="py-2" />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Last Name</Form.Label>
                          <Form.Control type="text" placeholder="Doe" className="py-2" />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control type="email" placeholder="john@example.com" className="py-2" />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Message</Form.Label>
                          <Form.Control as="textarea" rows={5} placeholder="How can we help you?" />
                        </Form.Group>
                      </Col>
                      <Col xs={12} className="mt-4">
                        <Button variant="primary" className="w-100 py-3 fw-bold rounded-pill">
                          Send Message
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </Col>
              
              <Col lg={5}>
                <div ref={infoRef} className={`scroll-animate slide-left delay-200 ${infoVisible ? 'is-visible' : ''} h-100`}>
                  <div className="trust-card bg-primary text-white border-0 h-100">
                    <h3 className="mb-4 text-white">Contact Information</h3>
                    <p className="text-white-50 mb-5">
                      Fill up the form and our team will get back to you within 24 hours.
                    </p>
                    
                    <div className="d-flex align-items-center mb-4">
                      <FiPhone className="me-3 fs-4" />
                      <div>
                        <h6 className="mb-1 text-white">Phone</h6>
                        <p className="mb-0 text-white-50">0312456781</p>
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center mb-4">
                      <FiMail className="me-3 fs-4" />
                      <div>
                        <h6 className="mb-1 text-white">Email</h6>
                        <p className="mb-0 text-white-50">support@proconnect.com</p>
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center">
                      <FiMapPin className="me-3 fs-4" />
                      <div>
                        <h6 className="mb-1 text-white">Office</h6>
                        <p className="mb-0 text-white-50">UMT Lahore</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </div>
  );
};

export default Contact;
