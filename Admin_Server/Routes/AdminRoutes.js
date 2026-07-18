import express from 'express';
import {
  ActivateProvider,
  AdminLogin,
  AdminMe,
  BanProvider,
  DeactivateProvider,
  DeleteAllBookings,
  DeleteProviderAccount,
  DeleteUserAccount,
  GetAccounts,
  GetAdminSummary,
  GetProviders,
  GetUsers,
  GetAllBookings,
  UnbanProvider,
  GetAllComplaints,
  DeleteAllComplaints,
  WarnProvider
} from '../Controllers/AdminController.js';
import { VerifyAdminToken } from '../Middleware/AdminAuth.js';

const adminRouter = express.Router();

adminRouter.post('/login', AdminLogin);

adminRouter.use(VerifyAdminToken);

adminRouter.get('/me', AdminMe);
adminRouter.get('/summary', GetAdminSummary);
adminRouter.get('/accounts', GetAccounts);
adminRouter.get('/users', GetUsers);
adminRouter.get('/providers', GetProviders);
adminRouter.get('/allbooking', GetAllBookings);
adminRouter.get('/complaints', GetAllComplaints);
adminRouter.delete('/allbooking', DeleteAllBookings);
adminRouter.delete('/complaints', DeleteAllComplaints);
adminRouter.put('/providers/:id/activate', ActivateProvider);
adminRouter.put('/providers/:id/deactivate', DeactivateProvider);
adminRouter.put('/providers/:id/warn', WarnProvider);
adminRouter.put('/providers/:id/ban', BanProvider);
adminRouter.put('/providers/:id/unban', UnbanProvider);
adminRouter.delete('/users/:id', DeleteUserAccount);
adminRouter.delete('/providers/:id', DeleteProviderAccount);

export default adminRouter;
