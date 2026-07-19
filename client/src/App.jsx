import React, { useCallback, useEffect } from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import BackToTop from './components/BackToTop';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Providers from './pages/Providers';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import MyBookings from './pages/MyBookings';
import Detail from './pages/Detail';
import Complain from './pages/Complain';
import PaymentResult from './pages/PaymentResult';
import { getTokenExpiration } from './Auth/LogoutHandler.js';
import ForgotPasswordForm from './pages/ForgotPasswordForm.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Services from './pages/Services';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';
import Contact from './pages/Contact';

const RoleRoute = ({ allowedRoles, children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
};
const HomeRoute = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role === 'provider') return <Navigate to="/profile" replace />;
  return <Home />;
};
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  }, [navigate]);
  useEffect(() => {
    if (location.pathname.startsWith('//')) {
      navigate(`${location.pathname.replace(/^\/+/, '/')}${location.search}${location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const expiryTime = getTokenExpiration(token);
    const currentTime = Date.now();
    if (expiryTime <= currentTime) {
      logout();
      return;
    }
    const timeout = setTimeout(() => {
      logout();
    }, expiryTime - currentTime);
    return () => clearTimeout(timeout);
  }, [logout]);
  return (
    <>
      <Navigation />
      <div style={{ paddingTop: '76px' }}> {/* Offset for fixed navbar */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><HomeRoute /></PageTransition>} />
            <Route path="/services" element={<PageTransition><Services /></PageTransition>} />
            <Route path="/how-it-works" element={<PageTransition><HowItWorks /></PageTransition>} />
            <Route path="/about" element={<PageTransition><About /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/providers" element={<PageTransition><Providers /></PageTransition>} />
            <Route path='/profile' element={<PageTransition><Profile /></PageTransition>} />
            <Route path='/edit-profile' element={<PageTransition><EditProfile /></PageTransition>} />
            <Route path='/my-bookings' element={<PageTransition><MyBookings /></PageTransition>} />
            <Route path='/payment-success' element={<PageTransition><PaymentResult /></PageTransition>} />
            <Route path='/payment-cancel' element={<PageTransition><PaymentResult cancelled /></PageTransition>} />
            <Route path='/detail/:id' element={<PageTransition><Detail /></PageTransition>} />
            <Route path='/complain' element={
              <PageTransition>
                <RoleRoute allowedRoles={['user']}>
                  <Complain />
                </RoleRoute>
              </PageTransition>
            } />
            <Route path='/forgotpassword' element={<PageTransition><ForgotPasswordForm /></PageTransition>} />
            <Route path='/resetpassword' element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path='/resetpassword/:token' element={<PageTransition><ResetPassword /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}
export default App;
