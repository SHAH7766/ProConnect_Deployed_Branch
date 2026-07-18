import React, { useCallback, useEffect } from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
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
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/services" element={<Services />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/providers" element={<Providers />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/edit-profile' element={<EditProfile />} />
          <Route path='/my-bookings' element={<MyBookings />} />
          <Route path='/payment-success' element={<PaymentResult />} />
          <Route path='/payment-cancel' element={<PaymentResult cancelled />} />
          <Route path='/detail/:id' element={<Detail />} />
          <Route path='/complain' element={
            <RoleRoute allowedRoles={['user']}>
              <Complain />
            </RoleRoute>
          } />
          <Route path='/forgotpassword' element={<ForgotPasswordForm />} />
          <Route path='/resetpassword' element={<ResetPassword />} />
          <Route path='/resetpassword/:token' element={<ResetPassword />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}
export default App;
