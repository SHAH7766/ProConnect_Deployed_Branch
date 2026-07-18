import express from 'express'
import { GetAll, RegisterUser, LoginController, RegisterProvider, loginProvider, DeleteUser, Profile, GetAllProviders, ForgotPassword, ResetPassword, UpdateProfilePassword, UpdateProfileContact, ActivateProvider } from "../Controllers/AuthController.js"
import { RegisterValidator, VerifyToken, ResetPasswordValidator } from "../Middleware/validator.js"
import { sendEmailOTP, ResetPasswordByOtp } from '../Controllers/OTPcontroller.js'
import { DetectServiceCategory, RecommendProviders } from '../Controllers/AIController.js'
const router = express.Router()
router.post("/regprovider", RegisterValidator, RegisterProvider)
router.post("/loginprovider", loginProvider)
router.post("/reguser", RegisterValidator, RegisterUser)
router.post("/loginuser", LoginController)
router.get("/getall", VerifyToken, GetAll)
router.delete("/delete/:id", VerifyToken, DeleteUser)
router.put("/provider/:id/activate", VerifyToken, ActivateProvider)
router.get("/profile", VerifyToken, Profile)
router.put("/profile/contact", VerifyToken, UpdateProfileContact)
router.put("/profile/password", VerifyToken, UpdateProfilePassword)
router.get("/getallproviders", GetAllProviders)
router.post("/forgotpassword", ForgotPassword)  //=> link to reset password
router.post("/resetpassword", ResetPasswordValidator, ResetPassword)  //=> reset password using token
router.post("/sendotp", sendEmailOTP)  //=> send OTP to email for verification
router.post("/verifyotp", ResetPasswordByOtp);
router.post("/detectcategory", DetectServiceCategory)
router.post("/recommendproviders", RecommendProviders)
export default router;
