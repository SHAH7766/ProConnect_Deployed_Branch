import express from 'express'
import jwt from 'jsonwebtoken'
export const RegisterValidator = async (req, res, next) => {
    const regex =/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
    try {
        const { username, name, email, password, cnic } = req.body
        const errors = []
        const finalUsername = username || name
        if (!finalUsername)
            errors.push("username is missing")
        if (!email)
            errors.push("email is missing")
        if (!password)
            errors.push("password is missing")
        if (!regex.test(password))
            errors.push("password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character")
        const cnicDigits = cnic ? String(cnic).replace(/[^0-9]/g, '') : ''
        if (cnicDigits && cnicDigits.length !== 13)
            errors.push("CNIC must be exactly 13 digits")
        if (errors.length > 0)
            return res.status(400).json({ errors: errors, success: false })
        next()
    } catch (error) {
        return res.status(501).send({ Message: "Internal server error", success: false })
    }
}
export const ResetPasswordValidator = async (req, res, next) => {
    const regex =/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
    try {
        const { token , password } = req.body
        const errors = []
        if (!token)
            errors.push("token is missing")
        if (!password)
            errors.push("password is missing")
        if (!regex.test(password))
            errors.push("password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character")
        if (errors.length > 0)
            return res.status(400).json({ errors: errors, success: false })
        next()
    } catch (error) {
        return res.status(501).send({ Message: "Internal server error", success: false })
    }
}
import User from '../Model/User.js';
import Provider from '../Model/Provider.js';

export const VerifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) return res.status(401).send({ Message: "No token provided", success: false });

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userData = decoded.LoggedUser || decoded.LoggedProvider;

        if (!userData || !userData.id) return res.status(401).send({ Message: "Invalid token payload", success: false });

        // Check if user/provider still exists in db
        const userExists = await User.findById(userData.id) || await Provider.findById(userData.id);
        if (!userExists) {
            return res.status(401).send({ Message: "Account no longer exists", success: false });
        }

        req.user = userData;
        next();
    } catch (err) {
        return res.status(401).send({ Message: "Token expired or invalid", success: false });
    }
}
