import React, { useEffect, useState } from 'react';
import { Container, Form, Button, Toast, ToastContainer, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiBriefcase, FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config/api';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cnic: '',
    password: '',
    confirmPassword: '',
    experience: '',
    category: '',
    charges: '',
    bankAccountNumber: ''
  });
  const [isProvider, setIsProvider] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });

  const baseURL = API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const { password } = formData;
    setPasswordCriteria({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    });
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

    if (!isPasswordValid) {
      return setToast({ show: true, message: 'Please meet all password requirements', type: 'danger' });
    }

    if (formData.password !== formData.confirmPassword) {
      return setToast({ show: true, message: 'Passwords do not match', type: 'danger' });
    }

    const endpoint = isProvider ? `${baseURL}/api/regprovider` : `${baseURL}/api/reguser`;

    const payload = isProvider
      ? { ...formData, password: formData.password } // omits confirmPassword in a real app, but backend ignores extras
      : {
        name: formData.name,
        email: formData.email,
        cnic: formData.cnic,
        password: formData.password,
      };

    try {
      setLoading(true);
      const { data } = await axios.post(endpoint, payload);
      if (!data?.success) {
        return setToast({ show: true, message: data?.Message || 'Registration failed', type: 'danger' });
      }
      setToast({ show: true, message: data.Message || 'Registration successful!', type: 'success' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.Message || 'Something went wrong', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="auth-header">
          <h5 className="text-primary fw-bold mb-4" style={{fontSize: '0.9rem'}}>ProConnect</h5>
          <h2>Create Your Account</h2>
          <p>Join the community of elite professionals and clients.</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <div className="role-selector-container">
            <div className={`role-card ${!isProvider ? 'active' : ''}`} onClick={() => setIsProvider(false)}>
              <div className="role-card-icon-wrapper mx-auto">
                <FiUser />
              </div>
              <h5 className="mb-0">Customer</h5>
              {!isProvider && <FiCheckCircle className="role-check" />}
            </div>
            
            <div className={`role-card ${isProvider ? 'active' : ''}`} onClick={() => setIsProvider(true)}>
              <div className="role-card-icon-wrapper mx-auto">
                <FiBriefcase />
              </div>
              <h5 className="mb-0">Provider</h5>
              {isProvider && <FiCheckCircle className="role-check" />}
            </div>
          </div>

          <div className="auth-input-group">
            <FiUser className="auth-input-icon" />
            <input type="text" name="name" placeholder="FULL NAME" onChange={handleChange} required />
          </div>

          <div className="auth-input-group">
            <FiMail className="auth-input-icon" />
            <input type="email" name="email" placeholder="EMAIL ADDRESS" onChange={handleChange} required />
          </div>

          <div className="auth-input-group">
            <FiUser className="auth-input-icon" />
            <input type="text" name="cnic" placeholder="CNIC NUMBER" value={formData.cnic} onChange={handleChange} required />
          </div>

          <div className="auth-input-group">
            <FiLock className="auth-input-icon" />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="PASSWORD" 
              onChange={handleChange} 
              required 
            />
            <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <div className="password-criteria">
            <div className={`criterion ${passwordCriteria.length ? 'valid' : ''}`}>
              {passwordCriteria.length ? <FiCheckCircle /> : '○'} 8+ Characters
            </div>
            <div className={`criterion ${passwordCriteria.upper ? 'valid' : ''}`}>
              {passwordCriteria.upper ? <FiCheckCircle /> : '○'} Uppercase
            </div>
            <div className={`criterion ${passwordCriteria.number ? 'valid' : ''}`}>
              {passwordCriteria.number ? <FiCheckCircle /> : '○'} Number
            </div>
            <div className={`criterion ${passwordCriteria.special ? 'valid' : ''}`}>
              {passwordCriteria.special ? <FiCheckCircle /> : '○'} Special Char
            </div>
          </div>

          <div className="auth-input-group mb-4">
            <FiLock className="auth-input-icon" />
            <input 
              type="password" 
              name="confirmPassword" 
              placeholder="CONFIRM PASSWORD" 
              onChange={handleChange} 
              required 
            />
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="auth-bottom-link">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </Form>
      </motion.div>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg={toast.type} show={toast.show} onClose={() => setToast({ ...toast, show: false })} delay={3000} autohide>
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default Register;
