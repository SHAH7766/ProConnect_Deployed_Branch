import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FiSearch, FiCalendar, FiCheckCircle, FiStar } from 'react-icons/fi';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const StepRow = ({ icon, title, description, image, isReversed }) => {
  const [ref, isVisible] = useScrollAnimation({ threshold: 0.2 });
  
  return (
    <div ref={ref} className={`row align-items-center mb-5 pb-4 scroll-animate ${isVisible ? 'is-visible' : ''}`}>
      <Col lg={6} className={isReversed ? 'order-lg-2 mb-4 mb-lg-0' : 'mb-4 mb-lg-0'}>
        <div className="hero-image-wrapper">
          <img src={image} alt={title} className="hero-image" />
        </div>
      </Col>
      <Col lg={6} className={isReversed ? 'order-lg-1 pe-lg-5' : 'ps-lg-5'}>
        <div className="trust-icon mb-3">{icon}</div>
        <h2 className="trust-title text-start mb-3">{title}</h2>
        <p className="trust-subtitle ms-0 text-start">{description}</p>
      </Col>
    </div>
  );
};

const HowItWorks = () => {
  const [headerRef, headerVisible] = useScrollAnimation();

  const steps = [
    {
      icon: <FiSearch />,
      title: '1. Find the Right Pro',
      description: 'Browse through our vetted list of professionals. Use our AI-powered search to instantly match with the right expert for your specific needs.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop',
      isReversed: false
    },
    {
      icon: <FiCalendar />,
      title: '2. Book & Schedule',
      description: 'Select a time that works for you. Our built-in scheduling system ensures seamless coordination without the back-and-forth emails.',
      image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=1000&auto=format&fit=crop',
      isReversed: true
    },
    {
      icon: <FiCheckCircle />,
      title: '3. Get It Done',
      description: 'The professional arrives and completes the work. Payment is held securely in escrow until you are completely satisfied with the results.',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1000&auto=format&fit=crop',
      isReversed: false
    },
    {
      icon: <FiStar />,
      title: '4. Rate & Review',
      description: 'Leave a rating to help the community. High-quality work gets rewarded, ensuring only the best professionals stay on ProConnect.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop',
      isReversed: true
    }
  ];

  return (
    <div className="pt-5 mt-5">
        <section className="hero-section-modern text-center pb-5">
          <Container>
            <div ref={headerRef} className={`scroll-animate ${headerVisible ? 'is-visible' : ''}`}>
              <h1 className="hero-title-modern mb-3">How It <em>Works</em></h1>
              <p className="hero-subtitle-modern mx-auto">
                Getting your project done has never been easier. Follow these simple steps.
              </p>
            </div>
          </Container>
        </section>

        <section className="categories-section pt-0">
          <Container>
            {steps.map((step, index) => (
              <StepRow key={index} {...step} />
            ))}
          </Container>
        </section>
      </div>
  );
};

export default HowItWorks;
