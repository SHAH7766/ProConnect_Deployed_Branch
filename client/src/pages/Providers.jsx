import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Form } from 'react-bootstrap';
import axios from 'axios';
import { FiCpu, FiDollarSign, FiSearch, FiStar, FiTrendingUp, FiUserCheck, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { API_BASE_URL } from '../config/api';
import { motion } from 'framer-motion';

const formatCompletionRate = (completionRate) => (
  completionRate === null || completionRate === undefined ? 'N/A' : `${completionRate}%`
);

const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryReason, setCategoryReason] = useState('');
  const [userNeed, setUserNeed] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [heroRef, heroVisible] = useScrollAnimation();
  const [searchRef, searchVisible] = useScrollAnimation();
  const [listRef, listVisible] = useScrollAnimation();

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const baseURL = API_BASE_URL;

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleViewProfile = (providerId) => {
    const profilePath = `/detail/${providerId}`;
    const navState = { from: profilePath, description: userNeed };
    if (!token) {
      navigate('/login', { state: navState });
    } else {
      navigate(profilePath, { state: navState });
    }
  };

  const allowedCategories = ['Plumber', 'Plumbing', 'Electrical', 'Electronics'];

  const normalizeServiceCategory = (category) => {
    if (!category) return category;
    return category === 'Electrical' ? 'Electronics' : category;
  };

  const getRecommendationForProvider = (providerId) => {
    return recommendations.find((item) => item.providerId === providerId);
  };

  const fetchProvidersByCategory = async (category) => {
    const normalizedCategory = normalizeServiceCategory(category);
    const params = new URLSearchParams({ category: normalizedCategory });
    const response = await axios.get(`${baseURL}/api/providers/search?${params.toString()}`);
    return response.data;
  };

  const getAiRecommendations = async (providerList, categoryString) => {
    const { data } = await axios.post(`${baseURL}/api/recommendproviders`, {
      providers: providerList,
      category: categoryString,
      userNeed
    });

    setRecommendations(data.recommendations || []);
  };

  useEffect(() => {
    const trimmedNeed = userNeed.trim();

    if (trimmedNeed.length < 8) {
      setProviders([]);
      setRecommendations([]);
      setSelectedCategories([]);
      setCategoryReason('');
      setHasSearched(false);
      setError(null);
      return;
    }

    const timeout = setTimeout(() => {
      searchProvidersWithAi(trimmedNeed);
    }, 900);

    return () => clearTimeout(timeout);
  }, [userNeed]);

  const searchProvidersWithAi = async (problemText) => {
    if (!problemText.trim()) {
      return;
    }

    try {
      setLoading(true);
      setAiLoading(true);
      setError(null);
      setHasSearched(true);
      setProviders([]);
      setRecommendations([]);
      setCategoryReason('');

      const { data: categoryData } = await axios.post(`${baseURL}/api/detectcategory`, {
        problem: problemText
      });

      if (!categoryData.success || categoryData.unsupported || !categoryData.categories || categoryData.categories.length === 0) {
        setSelectedCategories([]);
        setCategoryReason(categoryData.reason || categoryData.Message || 'This issue does not match the available service categories.');
        setError(categoryData.reason || categoryData.Message || 'This issue does not match the available service categories.');
        return;
      }

      const detectedCategories = categoryData.categories.filter(c => allowedCategories.includes(c));
      if (detectedCategories.length === 0) {
        setSelectedCategories([]);
        const friendlyMessage = 'We currently support only plumbing and electrical issues. Please describe a related problem.';
        setCategoryReason(friendlyMessage);
        setError(friendlyMessage);
        return;
      }

      setSelectedCategories(detectedCategories);
      setCategoryReason(categoryData.reason || '');

      const allProviderLists = await Promise.all(
        detectedCategories.map(cat => fetchProvidersByCategory(cat))
      );
      
      const uniqueProvidersMap = new Map();
      allProviderLists.forEach(list => {
          list.forEach(provider => {
              uniqueProvidersMap.set(provider._id, provider);
          });
      });
      const providerList = Array.from(uniqueProvidersMap.values());
      
      setProviders(providerList);

      if (providerList.length > 0) {
        await getAiRecommendations(providerList, detectedCategories.join(' and '));
      }
    } catch (err) {
      console.error('AI provider search error', err);
      setError(err.response?.data?.Message || 'Unable to analyze your problem.');
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <div className="providers-page py-5" style={{ background: 'var(--bg-main)', minHeight: 'calc(100vh - 76px)' }}>
      <Container>
        <section ref={heroRef} className={`providers-hero mb-5 position-relative overflow-hidden scroll-animate ${heroVisible ? 'is-visible' : ''}`}>
          <div className="hero-decor-circle hero-decor-circle-1"></div>
          <div className="hero-decor-circle hero-decor-circle-2"></div>
          <div className="hero-decor-wave"></div>

          <div className="text-center mb-4">
            <h2 className="hero-heading">Tell Us The Problem</h2>
            <p className="hero-subtitle">Briefly describe your issue and let AI recommend the best provider instantly.</p>
          </div>

          <div ref={searchRef} className={`glass-card hero-card mx-auto scroll-animate ${searchVisible ? 'is-visible' : ''}`}>
            <Form>
              <Row className="g-3 align-items-end">
                <Col xs={12}>
                  <Form.Label>Request Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="userNeed"
                    placeholder="Type your request here..."
                    value={userNeed}
                    onChange={(e) => setUserNeed(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        searchProvidersWithAi(userNeed);
                      }
                    }}
                    className="animated-input"
                  />
                </Col>


                {selectedCategories.length > 0 && categoryReason && (
                  <Col xs={12}>
                    <Alert variant="info" className="mb-0 hero-alert shadow-sm">
                      <strong>AI selected: {selectedCategories.join(', ')}</strong>
                      <div className="small mt-1">{categoryReason}</div>
                    </Alert>
                  </Col>
                )}

                {(aiLoading || loading) && (
                  <Col xs={12} className="text-center text-muted fw-semibold">
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    AI is finding the right providers...
                  </Col>
                )}
              </Row>
            </Form>
          </div>

        </section>

        {error && <Alert variant="danger" className="text-center">{error}</Alert>}

        {!loading && (
          <div ref={listRef} className={`providers-grid scroll-animate ${listVisible ? 'is-visible' : ''}`}>
            {providers.length > 0 ? (
              <Row className="g-4">
              {providers.map((provider, index) => (
                <Col lg={4} md={6} key={provider._id}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
                  >
                  <Card className="provider-card h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-4">
                      {getRecommendationForProvider(provider._id) && (
                        <Badge bg="primary" className="mb-3 badge-pill">
                          <FiCpu className="me-1" />
                          AI Pick
                        </Badge>
                      )}
                      <div className="provider-avatar shadow-sm mb-3">
                        {provider.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <Card.Title className="fw-bold mb-1">{provider.name}</Card.Title>

                      <Badge bg="light" text="dark" className="mb-3 d-inline-flex align-items-center gap-1 border">
                        <FiUserCheck className="text-success" /> Verified {provider.category}
                      </Badge>

                      <div className="text-start mt-3 pt-3 border-top">
                        <p className="mb-2 d-flex align-items-center gap-2 text-muted small">
                          <FiDollarSign className="text-success" />
                          <span>
                            Charges: <strong>Rs. {provider.charges}</strong>
                            {provider.travelFee > 0 && <small className="text-muted"> incl. Rs. {provider.travelFee} travel</small>}
                          </span>
                        </p>
                        {provider.location && (provider.location.city || provider.location.area) && (
                          <p className="mb-2 d-flex align-items-center gap-2 text-muted small">
                            <FiMapPin className="text-danger" />
                            <span>
                              {[provider.location.city, provider.location.area].filter(Boolean).join(', ')}
                            </span>
                          </p>
                        )}
                        <p className="mb-0 d-flex align-items-center gap-2 text-muted small">
                          <FiTrendingUp className="text-primary" />
                          <span>Completion: <strong>{formatCompletionRate(provider.completionRate)}</strong></span>
                        </p>
                        <p className="mb-0 mt-3 small fst-italic" style={{ color: '#ffffff' }}>
                          {provider.reviewSummary || 'No customer reviews yet.'}
                        </p>
                      </div>
                    </Card.Body>
                    <Card.Footer className="bg-transparent border-0 pb-4 px-4 pt-0">
                      <button onClick={() => handleViewProfile(provider._id)} className="btn btn-primary-custom w-100 py-2">
                        View Profile
                      </button>
                    </Card.Footer>
                  </Card>
                  </motion.div>
                </Col>
              ))}
              </Row>
            ) : hasSearched ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-5 text-muted empty-state-card shadow-sm col-12"
              >
                <FiSearch size={34} className="mb-3 empty-state-float" />
                <h4 className="fw-bold">No active {selectedCategories.length > 0 ? selectedCategories.join(' or ') : 'matching'} providers available.</h4>
                <p className="mb-0">
                  AI detected that your issue needs {selectedCategories.length > 0 ? selectedCategories.join(' and/or ') : 'a matching provider'}, but no admin-approved providers are active in this category right now.
                </p>
              </motion.div>
            ) : null}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Providers;
