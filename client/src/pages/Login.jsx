import React, { useState } from 'react';
import { Container, Form, Button, Toast, ToastContainer } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProvider, setIsProvider] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'danger'
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email && !password) {
      return setToast({ show: true, message: 'Please enter email and password', type: 'danger' });
    }

    if (!email) {
      return setToast({ show: true, message: 'Email is required', type: 'danger' });
    }

    if (!password) {
      return setToast({ show: true, message: 'Password is required', type: 'danger' });
    }

    const baseURL = API_BASE_URL;
    const endpoint = isProvider
      ? `${baseURL}/api/loginprovider`
      : `${baseURL}/api/loginuser`;

    try {
      setLoading(true);
      const { data } = await axios.post(endpoint, { email, password });

      if (data && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);

        setToast({ show: true, message: 'Login successful!', type: 'success' });

        setTimeout(() => {
          if (data.role === 'provider') navigate('/profile');
          else if (data.role === 'admin') navigate('/allusers');
          else navigate(location.state?.from || '/providers', { replace: true, state: location.state });
        }, 1000);
      } else {
        setToast({ show: true, message: data.Message || 'Invalid credentials', type: 'danger' });
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.Message || 'Invalid credentials',
        type: 'danger'
      });
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
          <h2>Welcome Back</h2>
          <p>Choose your role and continue to ProConnect.</p>
        </div>

        <Form onSubmit={handleSubmit} noValidate>
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
              <FiMail className="auth-input-icon" />
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </motion.div>

            <motion.div variants={formItem} className="auth-input-group mb-2">
              <FiLock className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </motion.div>

            <motion.div variants={formItem}>
              <Link to="/forgotpassword" className="mb-4 d-block text-end fw-semibold text-primary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                Forgot password?
              </Link>
            </motion.div>

            <motion.div variants={formItem}>
              <motion.button
                type="submit"
                className="auth-btn-primary"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <><span className="auth-spinner" /> Signing In...</> : 'Sign In'}
              </motion.button>
            </motion.div>

            <motion.div variants={formItem} className="auth-bottom-link">
              Don't have an account? <Link to="/register">Register</Link>
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

export default Login;
