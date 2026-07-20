import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Form, Button, Toast, ToastContainer, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiBriefcase, FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiCheckCircle, FiCheck, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config/api';

const formContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};
const formItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
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
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const debounceTimer = useRef(null);

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

  const checkUsername = useCallback(async (username) => {
    const sanitized = username.toString().trim().toLowerCase();
    if (sanitized.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(sanitized)) {
      setUsernameStatus({ checking: false, available: false, message: 'Invalid characters. Use letters, numbers, dots, underscores or hyphens.' });
      return;
    }
    setUsernameStatus(prev => ({ ...prev, checking: true }));
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/check-username`, { username: sanitized });
      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.available ? 'Username available' : 'Username already taken'
      });
    } catch {
      setUsernameStatus({ checking: false, available: null, message: '' });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'username') {
      setUsernameStatus({ checking: false, available: null, message: '' });
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (value.trim().length >= 3) {
        setUsernameStatus(prev => ({ ...prev, checking: true }));
        debounceTimer.current = setTimeout(() => checkUsername(value), 500);
      }
    }
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

    const cnicDigits = formData.cnic.replace(/[^0-9]/g, '');
    if (!cnicDigits) {
      return setToast({ show: true, message: 'CNIC is required', type: 'danger' });
    }
    if (cnicDigits.length !== 13) {
      return setToast({ show: true, message: 'CNIC must be exactly 13 digits (e.g. 37405-1234567-1)', type: 'danger' });
    }

    const endpoint = isProvider ? `${baseURL}/api/regprovider` : `${baseURL}/api/reguser`;

    const payload = isProvider
      ? { ...formData, password: formData.password } // omits confirmPassword in a real app, but backend ignores extras
      : {
        username: formData.username,
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
          <motion.div variants={formContainer} initial="hidden" animate="visible">
            <motion.div variants={formItem} className="role-selector-container">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`role-card ${!isProvider ? 'active' : ''}`}
                onClick={() => setIsProvider(false)}
              >
                <div className="role-card-icon-wrapper mx-auto">
                  <FiUser />
                </div>
                <h5 className="mb-0">Customer</h5>
                {!isProvider && <FiCheckCircle className="role-check" />}
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`role-card ${isProvider ? 'active' : ''}`}
                onClick={() => setIsProvider(true)}
              >
                <div className="role-card-icon-wrapper mx-auto">
                  <FiBriefcase />
                </div>
                <h5 className="mb-0">Provider</h5>
                {isProvider && <FiCheckCircle className="role-check" />}
              </motion.div>
            </motion.div>

            <motion.div variants={formItem} className="auth-input-group">
              <FiUser className="auth-input-icon" />
              <input type="text" name="username" placeholder="USERNAME" value={formData.username} onChange={handleChange} required />
              {usernameStatus.checking && (
                <span className="auth-input-suffix"><span className="auth-spinner-sm" /></span>
              )}
              {!usernameStatus.checking && usernameStatus.available === true && (
                <span className="auth-input-suffix text-success"><FiCheck size={18} /></span>
              )}
              {!usernameStatus.checking && usernameStatus.available === false && (
                <span className="auth-input-suffix text-danger"><FiX size={18} /></span>
              )}
            </motion.div>
            {usernameStatus.message && (
              <motion.small
                className={`d-block mt-n2 mb-2 small ${usernameStatus.available ? 'text-success' : 'text-danger'}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {usernameStatus.message}
              </motion.small>
            )}

            <motion.div variants={formItem} className="auth-input-group">
              <FiMail className="auth-input-icon" />
              <input type="email" name="email" placeholder="EMAIL ADDRESS" onChange={handleChange} required />
            </motion.div>

            <motion.div variants={formItem} className="auth-input-group">
              <FiUser className="auth-input-icon" />
              <input type="text" name="cnic" placeholder="CNIC (e.g. 37405-1234567-1)" maxLength={15} value={formData.cnic} onChange={handleChange} required />
            </motion.div>

            <motion.div variants={formItem} className="auth-input-group">
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
            </motion.div>

            <motion.div variants={formItem} className="password-criteria">
              {['length', 'upper', 'number', 'special'].map((key, i) => (
                <motion.div
                  key={key}
                  className={`criterion ${passwordCriteria[key] ? 'valid' : ''}`}
                  animate={passwordCriteria[key] ? { scale: [1, 1.2, 1], color: '#10b981' } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {passwordCriteria[key] ? <FiCheckCircle /> : '○'} {
                    { length: '8+ Characters', upper: 'Uppercase', number: 'Number', special: 'Special Char' }[key]
                  }
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={formItem} className="auth-input-group mb-4">
              <FiLock className="auth-input-icon" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="CONFIRM PASSWORD"
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div variants={formItem}>
              <motion.button
                type="submit"
                className="auth-btn-primary"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <><span className="auth-spinner" /> Creating Account...</> : 'Create Account'}
              </motion.button>
            </motion.div>

            <motion.div variants={formItem} className="auth-bottom-link">
              Already have an account? <Link to="/login">Log In</Link>
            </motion.div>
          </motion.div>
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
