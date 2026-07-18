import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FiTool, FiZap, FiPenTool, FiWind, FiHome, FiSettings } from 'react-icons/fi';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const ServiceCard = ({ icon, title, description, delay }) => {
  const [ref, isVisible] = useScrollAnimation();
  return (
    <Col md={6} lg={4}>
      <div 
        ref={ref} 
        className={`trust-card scroll-animate hover-lift ${isVisible ? 'is-visible' : ''} delay-${delay}`}
      >
        <div className="trust-icon">{icon}</div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </Col>
  );
};

const Services = () => {
  const [headerRef, headerVisible] = useScrollAnimation();

  const servicesList = [
    { icon: <FiTool />, title: 'Plumber', desc: 'Expert pipe repairs, leak fixes, and full plumbing installations.' },
    { icon: <FiZap />, title: 'Electrician', desc: 'Safe wiring, panel upgrades, and lighting installations.' }
  ];

  return (
    <div className="pt-5 mt-5">
        <section className="hero-section-modern text-center pb-5">
          <Container>
            <div ref={headerRef} className={`scroll-animate ${headerVisible ? 'is-visible' : ''}`}>
              <h1 className="hero-title-modern mb-3">Our <em>Services</em></h1>
              <p className="hero-subtitle-modern mx-auto">
                Discover a wide range of professional services tailored to meet your home and business needs.
              </p>
            </div>
          </Container>
        </section>

        <section className="categories-section pt-0">
          <Container>
            <Row className="g-4 justify-content-center">
              {servicesList.map((service, index) => (
                <ServiceCard 
                  key={index} 
                  icon={service.icon} 
                  title={service.title} 
                  description={service.desc} 
                  delay={(index % 3) * 100 + 100}
                />
              ))}
            </Row>
          </Container>
        </section>
      </div>
  );
};

export default Services;
