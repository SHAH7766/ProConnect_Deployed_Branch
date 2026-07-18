
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Alert, Toast, ToastContainer } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const Complain = () => {
  let navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('');
  const [TypeOfComplaint, setTypeOfComplaint] = useState('');
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(location.state?.bookingId || '');
  const [selectedProviderId, setSelectedProviderId] = useState(location.state?.providerId || '');
  const [selectedProviderName, setSelectedProviderName] = useState(location.state?.providerName || '');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const baseURL = API_BASE_URL;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const token = localStorage.getItem('token');
    try {
      const { data } = await axios.get(`${baseURL}/api/mybookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(data.filter((booking) => booking.providerId?._id));
    } catch (error) {
      console.log(error);
    }
  };

  const handleBookingSelect = (bookingId) => {
    setSelectedBookingId(bookingId);
    const booking = bookings.find((item) => item._id === bookingId);
    setSelectedProviderId(booking?.providerId?._id || '');
    setSelectedProviderName(booking?.providerId?.name || '');
  };

  const handleSubmit = async (e) => {
    let token = localStorage.getItem('token') 
    e.preventDefault();
    if (!selectedProviderId) {
      return setToast({ show: true, message: 'Please select the booking/provider for this complaint.', type: 'danger' });
    }

    try {
      let result = await axios.post(`${baseURL}/api/customerservice`, {
        message,
        TypeOfComplaint,
        providerId: selectedProviderId,
        bookingId: selectedBookingId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToast({ show: true, message: result.data.Message, type: 'success' });
      setTimeout(() => {
        navigate('/')
      }, 1500);
      // Handle success (e.g., show a success message or redirect)
    } catch (error) {
      console.log(error);
      setToast({ show: true, message: 'An error occurred while submitting the complaint.', type: 'danger' });
      // Handle error (e.g., show an error message)
    }
  };
  return (
    <>
      <div className="container my-5">
        <h2 className="mb-4">Report a Problem</h2>
        <form onSubmit={handleSubmit}>
          {selectedProviderName ? (
            <Alert variant="warning">
              This complaint will warn provider: <strong>{selectedProviderName}</strong>
              {location.state?.serviceCategory ? ` (${location.state.serviceCategory})` : ''}
            </Alert>
          ) : (
            <div className="mb-3">
              <label htmlFor="bookingProvider" className="form-label">Complaint Against</label>
              <select className="form-select" id="bookingProvider" value={selectedBookingId} onChange={(e) => handleBookingSelect(e.target.value)} required>
                <option value="">Select a booking/provider</option>
                {bookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {booking.providerId?.name} - {booking.serviceCategory} - {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="complaintType" className="form-label">Type of Complaint</label>
            <select className="form-select" id="complaintType" value={TypeOfComplaint} onChange={(e) => setTypeOfComplaint(e.target.value)} required>
              <option value="">Select a type</option>
              <option value="service quality">Service Quality</option>
              <option value="payment issue">Payment Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="complaintMessage" className="form-label">Complaint Details</label>
            <textarea onChange={(e) => setMessage(e.target.value)} value={message} className="form-control" id="complaintMessage" rows="5" placeholder="Describe your issue in detail..." required></textarea>
          </div>
          <button type="submit" className="btn btn-danger">Submit Complaint</button>
        </form>
        <ToastContainer position="bottom-end" className="p-3" style={{ position: 'fixed', zIndex: 1050 }}>
          <Toast
            bg={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
            show={toast.show}
            delay={4000}
            autohide
          >
            <Toast.Header closeButton className={`text-${toast.type} fw-bold`}>
              <strong className="me-auto">Notification</strong>
            </Toast.Header>
            <Toast.Body className={toast.type === 'light' ? 'text-dark' : 'text-white fw-semibold'}>
              {toast.message}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </div>
    </>
  )
}

export default Complain
