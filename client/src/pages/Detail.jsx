import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Alert, Badge, Button, Col, Container, Form, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCalendar, FiCheckCircle, FiDollarSign, FiEdit3, FiImage, FiMapPin, FiNavigation, FiSend, FiStar, FiTrendingUp, FiX, FiBriefcase } from 'react-icons/fi'
import { API_BASE_URL } from '../config/api'
import { StaggerContainer, StaggerItem } from '../components/StaggerContainer'

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCompletionRate = (completionRate) => (
  completionRate === null || completionRate === undefined ? 'N/A' : `${completionRate}%`
);

const Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const baseURL = API_BASE_URL;
  const token = localStorage.getItem('token');
  const todayDateValue = getTodayDateValue();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationStatusKey, setLocationStatusKey] = useState(0);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [form, setForm] = useState({
    scheduledDate: '',
    selectedService: '',
    description: '',
    latitude: '',
    longitude: '',
    mapUrl: '',
    problemPhoto: '',
    problemPhotoFile: null
  });

  useEffect(() => {
    fetchProvider();
  }, [id]);

  useEffect(() => {
    if (location?.state?.description) {
      setForm((current) => ({ ...current, description: location.state.description }));
    }
  }, [location]);

  const fetchProvider = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 5000 });
          });
          params.append('latitude', position.coords.latitude);
          params.append('longitude', position.coords.longitude);
        } catch {
          // Distance is optional; provider details still load without browser location.
        }
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const { data } = await axios.get(`${baseURL}/api/providers/${id}${query}`);
      setProvider(data.provider);
    } catch (err) {
      console.error(err);
      setError('Unable to load provider profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ show: true, message: 'Please select an image file.', type: 'danger' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ show: true, message: 'Image must be 5MB or smaller.', type: 'danger' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((current) => ({ ...current, problemPhoto: reader.result, problemPhotoFile: file }));
    };
    reader.readAsDataURL(file);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      return setToast({ show: true, message: 'Location is not supported by this browser.', type: 'danger' });
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setForm((current) => ({
          ...current,
          latitude,
          longitude,
          mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
        }));
        setLocationStatusKey((current) => current + 1);
        setLocating(false);
        setToast({ show: true, message: 'Google Maps location added.', type: 'success' });
      },
      () => {
        setLocating(false);
        setToast({ show: true, message: 'Unable to get your location. Please allow location access.', type: 'danger' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!token) {
      setSubmitting(false);
      navigate('/login');
      return;
    }
    if (!form.scheduledDate) {
      setSubmitting(false);
      setToast({ show: true, message: 'Please select a date.', type: 'danger' });
      return;
    }
    if (!form.selectedService) {
      setSubmitting(false);
      setToast({ show: true, message: 'Please select a service type.', type: 'danger' });
      return;
    }
    if (!form.latitude || !form.longitude) {
      setSubmitting(false);
      setToast({ show: true, message: 'Please add your Google Maps location before sending request.', type: 'danger' });
      return;
    }
    if (!form.problemPhoto && !form.problemPhotoFile) {
      setSubmitting(false);
      setToast({ show: true, message: 'Please upload an object or problem picture.', type: 'danger' });
      return;
    }

    try {
      const payload = new FormData();
      payload.append('providerId', provider._id);
      payload.append('serviceCategory', form.selectedService);
      payload.append('scheduledDate', form.scheduledDate);
      payload.append('description', form.description);
      payload.append('charges', provider.charges);
      payload.append('address', JSON.stringify({
        latitude: form.latitude,
        longitude: form.longitude,
        mapUrl: form.mapUrl
      }));

      if (form.problemPhotoFile) {
        payload.append('problemPhoto', form.problemPhotoFile);
      }

      const { data } = await axios.post(`${baseURL}/api/bookings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setToast({ show: true, message: data.Message, type: 'success' });
      setTimeout(() => navigate('/profile'), 1400);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: err.response?.data?.Message || 'Unable to send request.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  return (
    <Container className="py-5">
      <Row className="g-4">
        <Col lg={7}>
          <div className="glass-card h-100 provider-profile-card">
            <div className="provider-header-section">
              <div className="provider-avatar-enhanced shadow-lg">
                {provider.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="provider-info">
                <h2 className="fw-bold mb-1 provider-name">{provider.name}</h2>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" className="category-badge">{provider.category}</Badge>
                  {provider.isActive && (
                    <Badge bg="success" className="status-badge">
                      <span className="status-dot"></span>
                      Available
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-muted provider-summary">{provider.summary}</p>

            <div className="stats-grid my-4">
              <div className="stat-card">
                <div className="stat-icon rating-icon">
                  <FiStar />
                </div>
                <div className="stat-content">
                  <strong className="stat-value">{provider.rating}</strong>
                  <span className="stat-label">Rating</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon completion-icon">
                  <FiTrendingUp />
                </div>
                <div className="stat-content">
                  <strong className="stat-value">{formatCompletionRate(provider.completionRate)}</strong>
                  <span className="stat-label">Completion</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon charges-icon">
                  <FiDollarSign />
                </div>
                <div className="stat-content">
                  <strong className="stat-value">Rs. {provider.charges}</strong>
                  <span className="stat-label">Charges</span>
                  {provider.travelFee > 0 && (
                    <div className="text-muted small mt-1">
                      Base Rs. {provider.baseCharges} + travel Rs. {provider.travelFee}
                    </div>
                  )}
                </div>
              </div>
              {provider.distance !== undefined && provider.distance !== null && (
                <div className="stat-card">
                  <div className="stat-icon distance-icon">
                    <FiMapPin />
                  </div>
                  <div className="stat-content">
                    <strong className="stat-value">{provider.distance.toFixed(1)} km</strong>
                    <span className="stat-label">Distance</span>
                  </div>
                </div>
              )}
            </div>

            <div className="skills-section">
              <h5 className="fw-bold section-title">Skills</h5>
              <div className="skills-container">
                {provider.skills.map((skill, index) => (
                  <button 
                    type="button" 
                    key={skill} 
                    className="skill-badge animate-up" 
                    style={{ animationDelay: `${index * 0.1}s`, border: '1px solid rgba(37, 99, 235, 0.2)', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 118, 110, 0.08))', color: '#2563eb', padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem' }}
                    onClick={() => {
                      setForm(current => {
                        const existing = current.description ? current.description.trim() : '';
                        const text = `Need assistance with: ${skill}`;
                        return {
                          ...current,
                          description: existing ? `${existing}\n${text}` : text
                        };
                      });
                    }}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div className="reviews-section">
              <h5 className="fw-bold section-title">Review Summary</h5>
              <p className="text-muted mb-3">
                {provider.reviewSummary || (provider.ratingCount > 0 ? `${provider.ratingCount} customer review${provider.ratingCount === 1 ? '' : 's'} recorded.` : 'No customer reviews yet.')}
              </p>
              {provider.recentReviews?.length > 0 && (
                <StaggerContainer className="reviews-list">
                  {provider.recentReviews.map((review, index) => (
                    <StaggerItem key={review._id}>
                    <div className="review-card">
                      <div className="review-header">
                        <strong>{review.customerName}</strong>
                        <div className="rating-stars">
                          {[...Array(5)].map((_, i) => (
                            <FiStar key={i} className={i < review.rating ? 'star-filled' : 'star-empty'} />
                          ))}
                          <span className="rating-number">{review.rating}/5</span>
                        </div>
                      </div>
                      {review.comment && <p className="text-muted small mb-0 review-comment">{review.comment}</p>}
                    </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </div>
        </Col>

        <Col lg={5}>
          <div className="glass-card booking-form-card">
            <div className="booking-form-header">
              <h4 className="fw-bold mb-1">Request Service</h4>
              <p className="text-muted small mb-0">Fill in the details to send a booking request</p>
            </div>
            
            <div className="booking-progress">
              <div className={`progress-step ${form.scheduledDate ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <span className="step-label">Date</span>
              </div>
              <div className={`progress-step ${form.mapUrl ? 'completed' : ''}`}>
                <div className="step-number">2</div>
                <span className="step-label">Location</span>
              </div>
              <div className={`progress-step ${form.description ? 'completed' : ''}`}>
                <div className="step-number">3</div>
                <span className="step-label">Details</span>
              </div>
              <div className={`progress-step ${form.problemPhoto ? 'completed' : ''}`}>
                <div className="step-number">4</div>
                <span className="step-label">Photo</span>
              </div>
            </div>

            <Form onSubmit={handleRequest}>
              <Form.Group className="mb-4 form-group-enhanced">
                <Form.Label className="form-label-enhanced">
                  <FiCalendar className="label-icon" />
                  Preferred Date
                </Form.Label>
                <Form.Control
                  name="scheduledDate"
                  type="date"
                  value={form.scheduledDate}
                  min={todayDateValue}
                  onChange={handleChange}
                  required
                  className="form-control-enhanced"
                />
              </Form.Group>

              <Form.Group className="mb-4 form-group-enhanced">
                <Form.Label className="form-label-enhanced">
                  <FiBriefcase className="label-icon" />
                  Service Type
                </Form.Label>
                <Form.Select
                  name="selectedService"
                  value={form.selectedService}
                  onChange={handleChange}
                  required
                  className="form-control-enhanced"
                >
                  <option value="">Select a service</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Plumber">Plumber</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-4 form-group-enhanced">
                <Form.Label className="form-label-enhanced">
                  <FiMapPin className="label-icon" />
                  Google Maps Location
                </Form.Label>
                {!form.mapUrl ? (
                  <Button
                    type="button"
                    variant="outline-primary"
                    className="w-100 location-button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                  >
                    {locating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <FiNavigation className="me-2" />
                        Use My Current Location
                      </>
                    )}
                  </Button>
                ) : (
                  <div key={locationStatusKey} className="location-confirmation-enhanced">
                    <div className="location-success">
                      <div className="success-icon">
                        <FiCheckCircle />
                      </div>
                      <div className="location-details">
                        <strong>Location Added</strong>
                        <div className="small text-muted">Your current Google Maps location is attached.</div>
                      </div>
                    </div>
                    <div className="location-actions">
                      <Button
                        as="a"
                        href={form.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                        variant="outline-primary"
                        className="location-action-btn"
                      >
                        <FiMapPin className="me-1" />
                        View Location
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-secondary"
                        onClick={useCurrentLocation}
                        disabled={locating}
                        className="location-action-btn"
                      >
                        {locating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <FiEdit3 className="me-1" />
                            Edit Location
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Form.Group>
              
              <Form.Group className="mb-4 form-group-enhanced">
                <Form.Label className="form-label-enhanced">
                  <FiEdit3 className="label-icon" />
                  Problem Details
                </Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={4} 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  placeholder="Describe the service you need..."
                  className="form-control-enhanced textarea-enhanced"
                />
                <div className="char-counter">
                  {form.description.length} characters
                </div>
              </Form.Group>
              
              <Form.Group className="mb-4 form-group-enhanced">
                <Form.Label className="form-label-enhanced">
                  <FiImage className="label-icon" />
                  Object/Problem Picture <span className="text-danger">*</span>
                </Form.Label>
                <div className="photo-upload-area">
                  <Form.Control 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    className="photo-input"
                    id="problemPhotoInput"
                  />
                  <label htmlFor="problemPhotoInput" className="photo-upload-label">
                    <FiImage className="upload-icon" />
                    <span>Click to upload or drag and drop</span>
                    <span className="upload-hint">PNG, JPG up to 5MB</span>
                  </label>
                </div>
                <AnimatePresence>
                {form.problemPhoto && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="photo-preview-enhanced"
                  >
                    <div className="preview-header">
                      <span className="preview-label">
                        <FiImage /> Preview
                      </span>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => setForm({ ...form, problemPhoto: '', problemPhotoFile: null })}
                        className="remove-photo-btn"
                      >
                        <FiX /> Remove
                      </Button>
                    </div>
                    <img
                      src={form.problemPhoto}
                      alt="Problem preview"
                      className="preview-image"
                    />
                  </motion.div>
                )}
                </AnimatePresence>
              </Form.Group>
              
              <div className="booking-info-banner">
                <FiCalendar className="info-icon" />
                <span>Request will be sent to the provider for acceptance</span>
              </div>
              
              <Button
                type="submit"
                className="btn-primary-custom w-100 submit-button d-flex align-items-center justify-content-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="auth-spinner" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <FiSend size={16} />
                    Send Request
                  </>
                )}
              </Button>
            </Form>
          </div>
        </Col>
      </Row>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          key={toast.message}
          bg={toast.type}
          show={toast.show}
          onClose={() => setToast({ ...toast, show: false })}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white">
            <FiCheckCircle className="me-2" />
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  )
}

export default Detail
