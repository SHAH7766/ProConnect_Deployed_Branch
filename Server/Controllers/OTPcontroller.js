import crypto from 'crypto';
import otpschema from "../Model/otp.js"
import User from '../Model/User.js';
import Provider from '../Model/Provider.js';
import { sendOtpEmail } from '../utils/SendOtp.js';
import { HashPassword } from '../Auth/Hash.js';
export const sendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Generate a secure 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // 2. Save to DB (expires in 5 mins)
        await otpschema.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );
        await sendOtpEmail(email, otp);

        res.status(200).json({ success: true, message: "OTP sent to email" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error sending OTP" });
    }
};
export const ResetPasswordByOtp = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        // 1. Verify OTP
        const findedOtp = await otpschema.findOne({ email })
        if (!findedOtp)
            return res.status(400).json({ success: false, message: "OTP not found" })
        if (findedOtp.otp !== otp)
            return res.status(400).json({ success: false, message: "Invalid OTP" })
        // 2. Hash new password and update user (not shown here)
        const hashedPassword = await HashPassword(password);
        const user = await User.findOne({ email });
        if (user) {
            user.password = hashedPassword;
            await user.save();
        } else {
            const provider = await Provider.findOne({ email });
            if (provider) {
                provider.password = hashedPassword;
                await provider.save();
            }
        }
        await otpschema.deleteOne({ email })
        res.status(200).json({ success: true, message: "Password reset successfully" })
    } catch (error) {
        res.status(500).json({ success: false, message: "Error resetting password" });
    }
}