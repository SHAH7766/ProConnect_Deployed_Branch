import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiBriefcase, FiCalendar, FiEdit, FiLogOut, FiUser, FiSearch, FiMoon, FiSun } from 'react-icons/fi';

const Navigation = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const canViewComplaints = userRole === 'user';

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <Navbar expand="lg" className="navbar-custom fixed-top py-3">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 footer-logo">
          <img src="/logo.jpg" alt="ProConnect Logo" style={{ height: '36px', width: '36px', borderRadius: '50%' }} />
          ProConnect
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
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
            <button className="btn btn-link text-dark p-0 border-0 me-2 theme-toggle-btn" onClick={toggleTheme}>
              {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <button className="btn btn-link text-dark p-0 border-0 me-2 theme-toggle-btn">
              <FiSearch size={20} />
            </button>
            {isLoggedIn ? (
              <NavDropdown title="Account" align="end" className="account-dropdown">
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
