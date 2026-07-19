import express from 'express'
const ComplaintsRouter = express.Router()
import { DeleteAllComplaints, CustomerService, GetAllComplaints, UpdateComplaintStatus, UnbanProvider } from "../Controllers/ComplaintsController.js"
import { VerifyToken } from '../Middleware/validator.js'
ComplaintsRouter.delete("/deleteall", VerifyToken, DeleteAllComplaints)
ComplaintsRouter.post("/customerservice", VerifyToken, CustomerService)
ComplaintsRouter.get("/allcomplaints", VerifyToken, GetAllComplaints)
ComplaintsRouter.put("/updatecomplaintstatus/:id", VerifyToken, UpdateComplaintStatus)
ComplaintsRouter.put("/unban/:providerId", VerifyToken, UnbanProvider)
export default ComplaintsRouter;