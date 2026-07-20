import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiBriefcase, FiCalendar, FiEdit, FiLogOut, FiUser, FiMoon, FiSun } from 'react-icons/fi';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import NotificationBell from './NotificationBell';

const Navigation = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const canViewComplaints = userRole === 'user';
  const isProvider = userRole === 'provider';

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [scrolled, setScrolled] = useState(false);
  const [pendingBookings, setPendingBookings] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Poll for pending bookings (providers only)
  useEffect(() => {
    if (!isLoggedIn || !isProvider) return;

    const fetchPendingCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_BASE_URL}/api/bookings/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingBookings(data.count || 0);
      } catch (err) {
        // Silently ignore - will retry on next interval
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, [isLoggedIn, isProvider]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleAccountClick = () => {
    if (isProvider && pendingBookings > 0) {
      setPendingBookings(0); // Clear badge when clicked
    }
  };

  return (
    <Navbar expand="lg" className={`navbar-custom fixed-top ${scrolled ? 'navbar-scrolled py-2' : 'py-3'}`}>
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 footer-logo">
          <img src="/logo.jpg" alt="ProConnect Logo" style={{ height: '36px', width: '36px', borderRadius: '50%' }} />
          ProConnect
        </Navbar.Brand>
        <div className="d-flex align-items-center gap-2">
          {isLoggedIn && <NotificationBell />}
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
        </div>
        <Navbar.Collapse id="basic-navbar-nav">
          {userRole !== 'provider' && (
            <Nav className="mx-auto gap-4">
              <Nav.Link as={Link} to="/">Home</Nav.Link>
              <Nav.Link as={Link} to="/services">Services</Nav.Link>
              <Nav.Link as={Link} to="/how-it-works">How It Works</Nav.Link>
              <Nav.Link as={Link} to="/about">About</Nav.Link>
              <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
            </Nav>
          )}
          <Nav className="ms-auto align-items-center gap-3 mt-3 mt-lg-0">
            <button className="btn btn-link p-0 border-0 me-2 theme-toggle-btn" onClick={toggleTheme}>
              {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            {isLoggedIn && <NotificationBell />}
            {isLoggedIn ? (
              <NavDropdown
                title={
                  <span onClick={handleAccountClick}>
                    Account
                    {isProvider && pendingBookings > 0 && (
                      <Badge bg="danger" pill className="ms-1" style={{ fontSize: '0.65rem', verticalAlign: 'top' }}>
                        {pendingBookings}
                      </Badge>
                    )}
                  </span>
                }
                align="end"
                className="account-dropdown"
              >
                <NavDropdown.Item as={Link} to="/profile">
                  <FiUser className="me-2" />
                  {userRole === 'provider' ? 'Dashboard' : 'Profile'}
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/edit-profile">
                  <FiEdit className="me-2" />
                  Edit Profile
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/my-bookings">
                  <FiCalendar className="me-2" />
                  My Bookings
                  {isProvider && pendingBookings > 0 && (
                    <Badge bg="danger" pill className="ms-2" style={{ fontSize: '0.65rem' }}>
                      {pendingBookings} new
                    </Badge>
                  )}
                </NavDropdown.Item>
                {canViewComplaints && (
                  <NavDropdown.Item as={Link} to="/complain">
                    <FiAlertTriangle className="me-2" />
                    Complaints
                  </NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout} className="text-danger">
                  <FiLogOut className="me-2" />
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-primary px-4 rounded-pill fw-semibold">Log In</Link>
                <Link to="/register" className="btn btn-primary px-4 rounded-pill fw-semibold">Sign Up Free</Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
