import express from 'express'
import colors from 'colors'
import 'dotenv/config'
import router from "./Routes/routes.js"
import { Dbconnection } from "./Config/Database.js"
import cors from 'cors'
import mongoose from 'mongoose'
import ComplaintsRouter from './Routes/ComplaintsRoutes.js'
import BookingRouter from './Routes/BookingRoutes.js'
import NotificationRouter from './Routes/NotificationRoutes.js'
import provider from './Model/Provider.js'
import { sendProviderActivationEmail } from './utils/ProviderActivationEmail.js'
const app = express()
Dbconnection()
const isLoopbackOrigin = (origin) => {
    try {
        const { hostname } = new URL(origin)
        return ['localhost', '127.0.0.1', '::1'].includes(hostname)
    } catch {
        return false
    }
}

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://proconnect123.vercel.app',
    ...(process.env.CLIENT_URL || '').split(','),
    process.env.RAILWAY_STATIC_URL,
].map((origin) => origin?.trim()).filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use(cors(corsOptions))
app.get("/", (req, res) => {
    res.send({ Message: "ProConnect API is running", success: true })
})
app.get("/api/health", (req, res) => {
    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    }

    res.send({
        server: "running",
        database: states[mongoose.connection.readyState] || "unknown",
        success: mongoose.connection.readyState === 1
    })
})

app.get("/api/diagnostics", (req, res) => {
    const safepayEnv = process.env.SAFEPAY_ENV || 'sandbox';
    const safepayHost = safepayEnv === 'production'
        ? 'https://api.getsafepay.com'
        : 'https://sandbox.api.getsafepay.com';

    res.send({
        server: "running",
        env: {
            SAFEPAY_ENV: safepayEnv,
            CLIENT_URL: process.env.CLIENT_URL || null,
            VITE_APP_URL: process.env.VITE_APP_URL || null,
            API_BASE_URL: process.env.API_BASE_URL || null
        },
        cors: {
            allowedOrigins,
            originHeader: req.get('origin') || null,
            refererHeader: req.get('referer') || null
        },
        safepay: {
            host: safepayHost,
            publicCheckoutBase: {
                sandbox: 'https://sandbox.api.getsafepay.com/embedded/',
                production: 'https://getsafepay.com/embedded/'
            }[safepayEnv]
        },
        success: true
    })
})

app.use("/api", router)
app.use('/api', ComplaintsRouter) // New route for complaints management
app.use('/api', BookingRouter)
app.use('/api', NotificationRouter)
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`.bgBrightBlue)
})

// Auto-Approve Providers Background Worker
setInterval(async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 300000);
        const pendingProviders = await provider.find({
            isActive: false,
            createdAt: { $lte: fiveMinutesAgo }
        });

        for (const p of pendingProviders) {
            p.isActive = true;
            if (!p.sandboxBankAccount?.accountNumber) {
                p.sandboxBankAccount = p.sandboxBankAccount || {};
                p.sandboxBankAccount.accountNumber = `SBX-${p._id.toString().slice(-12).toUpperCase()}`;
                p.sandboxBankAccount.accountTitle = p.name;
                p.sandboxBankAccount.bankName = 'ProConnect Sandbox Bank';
                p.sandboxBankAccount.balance = 0;
                p.sandboxBankAccount.currency = 'PKR';
                p.sandboxBankAccount.isSetupComplete = false;
            }
            await p.save();
            await sendProviderActivationEmail(p);
            console.log(`Auto-activated provider in background: ${p.name}`.bgGreen);
        }
    } catch (err) {
        console.error("Auto-activation cron error:", err.message);
    }
}, 30000);
