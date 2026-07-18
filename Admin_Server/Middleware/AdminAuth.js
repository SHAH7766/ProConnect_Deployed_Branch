import jwt from 'jsonwebtoken';
import User from '../Model/User.js';

export const VerifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).send({ Message: 'Admin token is required', success: false });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const adminPayload = decoded.Admin || decoded.LoggedUser;

    if (!adminPayload?.id || adminPayload.role !== 'admin') {
      return res.status(403).send({ Message: 'Admin access only', success: false });
    }

    const admin = await User.findById(adminPayload.id).select('-password');
    if (!admin || admin.role !== 'admin') {
      return res.status(403).send({ Message: 'Admin access only', success: false });
    }

    req.admin = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    };

    next();
  } catch (error) {
    return res.status(401).send({ Message: 'Invalid or expired admin token', success: false });
  }
};
