import Booking from "../Model/Booking.js";
import Provider from "../Model/Provider.js";
import Message from "../Model/Message.js";
import User from "../Model/User.js";
import Review from "../Model/Review.js";
import mongoose from "mongoose";
import { sendBookingNotification, sendCustomerBookingNotification, sendPaymentReceivedNotification, sendWorkCompletedNotification, sendBookingAcceptedNotification } from "../utils/BookingNotification.js";
import { uploadAudioBuffer, uploadImageBuffer } from "../utils/Cloudinary.js";
import { activeProviderFilter, isProviderActive } from "../utils/ProviderActivation.js";
import Safepay from "@sfpy/node-core";

const DEFAULT_NEW_PROVIDER_RATING = 3.2;
const DEFAULT_NEW_PROVIDER_COMPLETION_RATE = 70;
const DEFAULT_BASE_CHARGES = 1000;
const TRAVEL_RATE_PER_KM = 40;
const SAFEPAY_ENV = process.env.SAFEPAY_ENV || 'sandbox';
const SAFEPAY_HOST = SAFEPAY_ENV === 'production'
    ? 'https://api.getsafepay.com'
    : 'https://sandbox.api.getsafepay.com';
const SANDBOX_ACCOUNT_REGEX = /^[A-Za-z0-9 -]{6,34}$/;
const SAFEPAY_SUCCESS_STATES = new Set(['TRACKER_ENDED']);
const SAFEPAY_FAILURE_STATES = new Set([
    'TRACKER_CANCELLED',
    'TRACKER_CANCELED',
    'TRACKER_DECLINED',
    'TRACKER_EXPIRED',
    'TRACKER_FAILED',
    'TRACKER_REVERSED',
    'TRACKER_VOIDED'
]);
const createSandboxAccountNumber = (providerId) => `SBX-${providerId.toString().slice(-12).toUpperCase()}`;

const createControllerError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toNumberOrNull = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const calculateDistanceKm = (fromLat, fromLng, toLat, toLng) => {
    const lat1 = toNumberOrNull(fromLat);
    const lon1 = toNumberOrNull(fromLng);
    const lat2 = toNumberOrNull(toLat);
    const lon2 = toNumberOrNull(toLng);

    if ([lat1, lon1, lat2, lon2].some((value) => value === null)) return null;

    const toRadians = (degrees) => degrees * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((earthRadiusKm * c).toFixed(1));
};

const getProviderBookingStats = async (providerId, defaultCompletionRate = DEFAULT_NEW_PROVIDER_COMPLETION_RATE) => {
    const bookings = await Booking.find({ providerId }).select('status');
    const completed = bookings.filter((booking) => booking.status === 'Completed').length;
    const decided = bookings.filter((booking) => ['Completed', 'Cancelled', 'Disputed'].includes(booking.status)).length;

    return {
        jobsCompleted: completed,
        completionRate: decided > 0 ? Math.round((completed / decided) * 100) : defaultCompletionRate
    };
};

const calculateLocationAdjustedCharges = (baseCharges, distance) => {
    const parsedBase = Number(baseCharges || 0);
    const base = Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : DEFAULT_BASE_CHARGES;
    if (distance === null || distance === undefined) return Math.round(base);

    const travelFee = Math.ceil(Number(distance) * TRAVEL_RATE_PER_KM);
    return Math.round(base + travelFee);
};

const buildProviderReviewSummary = async (providerId) => {
    const reviews = await Review.find({ providerId, rating: { $gte: 3 } })
        .populate('customerId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('rating comment customerId createdAt');

    if (reviews.length === 0) {
        return {
            reviewSummary: 'No customer reviews yet.',
            recentReviews: []
        };
    }

    const average = reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
    const avgStr = average.toFixed(1);

    // Build star visual
    const fullStars = Math.floor(average);
    const halfStar = average - fullStars >= 0.5;
    const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));

    // Pick short highlight phrases from top reviews
    const highlights = reviews
        .map((review) => review.comment?.trim())
        .filter(Boolean)
        .slice(0, 2);

    const highlightText = highlights.length > 0
        ? ` — "${highlights.join('", "')}"`
        : '';

    const reviewSummary = `⭐ **${avgStr}/5** (${reviews.length} review${reviews.length === 1 ? '' : 's'}) ${stars}${highlightText}`;

    return {
        reviewSummary,
        recentReviews: reviews.map((review) => ({
            _id: review._id,
            rating: review.rating,
            comment: review.comment,
            customerName: review.customerId?.name || 'Customer',
            createdAt: review.createdAt
        }))
    };
};

const getSafepayClient = () => {
    if (!process.env.SAFEPAY_SECRET_KEY || !process.env.SAFEPAY_API_KEY) {
        throw new Error("Safepay keys are not configured");
    }

    return new Safepay(process.env.SAFEPAY_SECRET_KEY, {
        authType: 'secret',
        host: SAFEPAY_HOST
    });
};

const resolveClientUrl = (req) => {
    // Parse CLIENT_URL which may be comma-separated (e.g. "http://localhost:5173,https://proconnect123.vercel.app")
    const configuredUrls = (process.env.CLIENT_URL || '')
        .split(',')
        .map((url) => url.trim().replace(/\/$/, ''))
        .filter(Boolean);

    // Prefer a non-localhost URL from the configured list (production URL)
    const productionUrl = configuredUrls.find((url) => !/localhost|127\.0\.0\.1|::1/.test(url));
    if (productionUrl) {
        return productionUrl;
    }

    // If only localhost URLs are configured, try the request origin
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
        return origin.replace(/\/$/, '');
    }

    // Fall back to first configured URL, or localhost as last resort
    return configuredUrls[0] || 'http://localhost:5173';
};

const getSafepayTrackerToken = (response) => response?.data?.tracker?.token || response?.tracker?.token || response?.data?.token;
const getSafepayPassportToken = (response) => response?.data?.token || response?.data || response?.token;
const getSafepayTrackerState = (response) => response?.data?.state || response?.state;

const getSafepayFailureDetails = (source = {}) => {
    const payload = source?.response?.data || source?.data || source;
    const text = [
        payload?.state,
        payload?.action,
        payload?.code,
        payload?.reason,
        payload?.message,
        payload?.error,
        source?.state,
        source?.message
    ].filter(Boolean).join(' ');

    return {
        action: payload?.action || payload?.code || null,
        reason: payload?.reason || payload?.message || payload?.error || source?.message || null,
        text
    };
};

const isPayerAuthFailure = (details = {}) => /PAYER_AUTH|payer authentication|3d secure|3ds/i.test(details.text || '');

const isSafepayFailureState = (state = '') => {
    const normalizedState = String(state || '').toUpperCase();
    return SAFEPAY_FAILURE_STATES.has(normalizedState)
        || normalizedState.includes('FAIL')
        || normalizedState.includes('DECLIN')
        || normalizedState.includes('CANCEL')
        || normalizedState.includes('EXPIRE');
};

const buildSafepayFailureMessage = (details = {}) => {
    if (isPayerAuthFailure(details)) {
        return "Card authentication failed. Please retry the payment and complete the bank verification step, or use a Safepay-supported test card/payment method.";
    }

    return details.reason || "Payment failed or was cancelled. Please retry the payment from My Bookings.";
};

const sendPaymentReleaseWebhook = async (payload) => {
    const webhookUrl = process.env.N8N_PAYMENT_RELEASE_WEBHOOK_URL;
    if (!webhookUrl) return Promise.resolve();

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`n8n payment release webhook failed with status ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error("n8n payment release webhook error:", error.message);
        return Promise.reject(error);
    }
};

const releaseProviderPayment = async (booking, { releasedBy, providerAccountNumber = '' } = {}) => {
    if (booking.paymentStatus === 'Released') {
        return { released: false, webhookPayload: null };
    }

    const releaseProvider = await Provider.findById(booking.providerId);
    if (!releaseProvider) {
        throw createControllerError(404, "Provider not found for this booking");
    }

    const savedAccountNumber = releaseProvider.sandboxBankAccount?.accountNumber?.trim() || '';
    const finalProviderAccountNumber = savedAccountNumber
        || String(providerAccountNumber || '').trim()
        || createSandboxAccountNumber(releaseProvider._id);
    const releasedAmount = Number(booking.charges || 0);

    if (booking.status !== 'Completed') {
        throw createControllerError(400, "Payment can be released after the work is completed");
    }
    if (booking.paymentStatus !== 'Paid') {
        throw createControllerError(400, "Only held payments can be released");
    }
    if (!booking.completionPhoto) {
        throw createControllerError(400, "Completion proof photo is required before releasing payment");
    }
    if (!booking.customerCompletionConfirmed) {
        throw createControllerError(400, "Customer must confirm completed work before releasing payment");
    }
    if (!SANDBOX_ACCOUNT_REGEX.test(finalProviderAccountNumber)) {
        throw createControllerError(400, "Provider account number must be 6 to 34 letters or numbers");
    }
    if (!Number.isFinite(releasedAmount) || releasedAmount <= 0) {
        throw createControllerError(400, "Booking charges are missing for sandbox release");
    }

    releaseProvider.sandboxBankAccount = releaseProvider.sandboxBankAccount || {};
    releaseProvider.sandboxBankAccount.accountNumber = finalProviderAccountNumber;
    releaseProvider.sandboxBankAccount.accountTitle = releaseProvider.sandboxBankAccount.accountTitle || releaseProvider.name;
    releaseProvider.sandboxBankAccount.bankName = releaseProvider.sandboxBankAccount.bankName || 'ProConnect Sandbox Bank';
    releaseProvider.sandboxBankAccount.balance = Number(releaseProvider.sandboxBankAccount.balance || 0) + releasedAmount;
    releaseProvider.sandboxBankAccount.currency = releaseProvider.sandboxBankAccount.currency || 'PKR';
    releaseProvider.sandboxBankAccount.isSetupComplete = true;
    if (!Array.isArray(releaseProvider.sandboxBankAccount.transactions)) {
        releaseProvider.sandboxBankAccount.transactions = [];
    }
    releaseProvider.sandboxBankAccount.transactions.push({
        bookingId: booking._id,
        amount: releasedAmount,
        type: 'credit',
        description: `Sandbox release for ${booking.serviceCategory}`,
        createdAt: new Date()
    });

    booking.paymentStatus = 'Released';
    booking.paymentRelease = {
        providerAccountNumber: finalProviderAccountNumber,
        sandboxBankName: releaseProvider.sandboxBankAccount.bankName,
        releasedAmount,
        releasedAt: new Date(),
        releasedBy
    };

    await releaseProvider.save();

    return {
        released: true,
        webhookPayload: {
            event: 'payment.released',
            providerName: releaseProvider.name,
            providerEmail: releaseProvider.email,
            providerAccountNumber: finalProviderAccountNumber,
            amount: releasedAmount,
            currency: releaseProvider.sandboxBankAccount.currency,
            bookingId: booking._id.toString(),
            serviceCategory: booking.serviceCategory,
            releasedAt: booking.paymentRelease.releasedAt,
            releasedBy
        }
    };
};

const sendBookingRequestWebhook = async (payload) => {
    const webhookUrl = process.env.N8N_BOOKING_REQUEST_URL;
    if (!webhookUrl) return Promise.resolve();

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`n8n booking request webhook failed with status ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error("n8n booking request webhook error:", error.message);
        return Promise.reject(error);
    }
};

const normalizeCategory = (category = '') => {
    return category === 'Electrician' ? 'Electronics' : category;
};

const isPastDate = (value) => {
    const selectedDate = new Date(value);
    if (Number.isNaN(selectedDate.getTime())) return true;

    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return selectedDate < today;
};

const buildProviderStats = async (provider, customerLocation = {}) => {
    const category = normalizeCategory(provider.category || 'Plumber');
    const defaultCompletionRate = Number.isFinite(Number(provider.completionRate))
        ? Number(provider.completionRate)
        : DEFAULT_NEW_PROVIDER_COMPLETION_RATE;
    const { jobsCompleted, completionRate } = await getProviderBookingStats(provider._id, defaultCompletionRate);
    const distance = calculateDistanceKm(
        customerLocation.latitude,
        customerLocation.longitude,
        provider.location?.latitude,
        provider.location?.longitude
    );
    const baseCharges = Number(provider.charges || 0) > 0 ? provider.charges : DEFAULT_BASE_CHARGES;
    const calculatedCharges = calculateLocationAdjustedCharges(baseCharges, distance);
    const travelFee = Math.max(calculatedCharges - baseCharges, 0);
    const skills = category === 'Plumber'
        ? ['Leak repair', 'Pipe fitting', 'Drain cleaning']
        : ['Electronics repair', 'Fault diagnosis', 'Appliance service'];
    const { reviewSummary, recentReviews } = await buildProviderReviewSummary(provider._id);

    return {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        role: provider.role,
        experience: provider.experience,
        category,
        rating: Number((provider.ratingAverage || DEFAULT_NEW_PROVIDER_RATING).toFixed(1)),
        ratingCount: provider.ratingCount || 0,
        baseCharges,
        travelFee,
        charges: calculatedCharges,
        distance,
        completionRate,
        jobsCompleted,
        location: provider.location || {},
        skills,
        summary: `${provider.name} is a verified ${category.toLowerCase()} with ${provider.experience} years of experience, Rs. ${calculatedCharges} estimated charges, and ${completionRate}% completion rate.`,
        reviewSummary,
        recentReviews,
    };
};

export const SearchProviders = async (req, res) => {
    try {
        const { category, maxCharges, maxDistance, minCompletionRate, latitude, longitude } = req.query;
        const providers = await Provider.find(activeProviderFilter()).select('-password');
        let result = await Promise.all(providers.map((item) => buildProviderStats(item, { latitude, longitude })));

        if (category) {
            const requestedCategory = normalizeCategory(category).toLowerCase();
            result = result.filter((item) => item.category.toLowerCase() === requestedCategory);
        }
        if (maxCharges) {
            result = result.filter((item) => item.charges <= Number(maxCharges));
        }
        if (maxDistance) {
            result = result.filter((item) => item.distance !== null && item.distance <= Number(maxDistance));
        }
        if (minCompletionRate) {
            result = result.filter((item) => item.completionRate !== null && item.completionRate >= Number(minCompletionRate));
        }

        result.sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.ratingCount - a.ratingCount;
        });

        return res.status(200).send(result);
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const GetProviderDetails = async (req, res) => {
    try {
        const provider = await Provider.findById(req.params.id).select('-password');
        if (!provider || !isProviderActive(provider)) {
            return res.status(404).send({ Message: "Provider not found", success: false });
        }

        const providerStats = await buildProviderStats(provider, {
            latitude: req.query.latitude,
            longitude: req.query.longitude
        });

        return res.status(200).send({ provider: providerStats, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const CreateBooking = async (req, res) => {
    try {
        const { providerId, serviceCategory, description, scheduledDate, charges } = req.body;
        const address = typeof req.body.address === 'string'
            ? JSON.parse(req.body.address || '{}')
            : req.body.address;
        const latitude = Number(address?.latitude);
        const longitude = Number(address?.longitude);

        if (!providerId || !serviceCategory || !scheduledDate) {
            return res.status(400).send({ Message: "Provider, category, and date are required", success: false });
        }
        if (isPastDate(scheduledDate)) {
            return res.status(400).send({ Message: "Please select today or a future date", success: false });
        }
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).send({ Message: "Please share your Google Maps location for this service request", success: false });
        }

        let problemPhoto = '';
        if (req.file) {
            const uploadedImage = await uploadImageBuffer(req.file.buffer);
            problemPhoto = uploadedImage.secure_url;
        } else if (req.body.problemPhoto) {
            problemPhoto = req.body.problemPhoto;
        }

        const selectedProvider = await Provider.findById(providerId).select('email name charges isActive sandboxBankAccount');
        if (!selectedProvider || !isProviderActive(selectedProvider)) {
            return res.status(400).send({ Message: "This provider account is not active yet", success: false });
        }
        const requestedCharges = Number(charges);
        const baseCharges = Number(selectedProvider.charges || 0) > 0 ? selectedProvider.charges : DEFAULT_BASE_CHARGES;
        const finalCharges = Number.isFinite(requestedCharges) && requestedCharges >= baseCharges
            ? Math.round(requestedCharges)
            : baseCharges;

        const booking = await Booking.create({
            customerId: req.user.id,
            providerId,
            serviceCategory,
            description,
            scheduledDate,
            address: {
                ...address,
                latitude,
                longitude,
                mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
            },
            charges: finalCharges,
            problemPhoto,
        });

        const [, customer] = await Promise.all([
            Promise.resolve(selectedProvider),
            User.findById(req.user.id).select('name email')
        ]);

        if (selectedProvider?.email) {
            const bookingNotificationPayload = {
                event: 'booking.requested',
                providerName: selectedProvider.name,
                providerEmail: selectedProvider.email,
                customerName: customer?.name || req.user.name || "Customer",
                customerEmail: customer?.email || '',
                bookingId: booking._id.toString(),
                serviceCategory,
                scheduledDate,
                formattedScheduledDate: new Date(scheduledDate).toLocaleDateString(),
                charges: finalCharges,
                currency: 'PKR',
                description,
                address: booking.address,
                problemPhoto,
                createdAt: booking.createdAt
            };

            if (process.env.N8N_BOOKING_REQUEST_URL) {
                sendBookingRequestWebhook(bookingNotificationPayload);
            }
            
            sendBookingNotification(selectedProvider.email, {
                customerName: bookingNotificationPayload.customerName,
                serviceCategory,
                scheduledDate: bookingNotificationPayload.formattedScheduledDate,
                charges: finalCharges,
                description
            });

            if (customer?.email) {
                sendCustomerBookingNotification(customer.email, {
                    customerName: bookingNotificationPayload.customerName,
                    providerName: bookingNotificationPayload.providerName,
                    serviceCategory,
                    scheduledDate: bookingNotificationPayload.formattedScheduledDate,
                    charges: finalCharges
                });
            }
        }

        return res.status(201).send({ Message: "Service request sent successfully", booking, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const GetMyBookings = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? {}
            : req.user.role === 'provider'
                ? { providerId: req.user.id }
                : { customerId: req.user.id };

        const bookings = await Booking.find(filter)
            .populate('providerId', 'name email phone experience sandboxBankAccount')
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 });

        const bookingIds = bookings.map((booking) => booking._id);
        const reviews = await Review.find({ bookingId: { $in: bookingIds } }).select('bookingId');
        const reviewedBookingIds = new Set(reviews.map((review) => review.bookingId.toString()));
        const result = bookings.map((booking) => {
            const bookingObject = booking.toObject();
            if (req.user.role !== 'admin' && bookingObject.paymentRelease?.providerAccountNumber) {
                bookingObject.paymentRelease = {
                    ...bookingObject.paymentRelease,
                    providerAccountNumber: undefined
                };
            }
            if (req.user.role !== 'admin' && bookingObject.providerId?.sandboxBankAccount) {
                bookingObject.providerId = {
                    ...bookingObject.providerId,
                    sandboxBankAccount: undefined
                };
            }

            return {
                ...bookingObject,
                hasReview: reviewedBookingIds.has(booking._id.toString())
            };
        });

        return res.status(200).send(result);
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const GetLatestIncomingChatMessages = async (req, res) => {
    try {
        const filter = req.user.role === 'provider'
            ? { providerId: req.user.id }
            : { customerId: req.user.id };

        const bookings = await Booking.find({
            ...filter,
            status: { $in: ['Accepted', 'In-Progress', 'Completed'] },
            paymentStatus: { $in: ['Paid', 'Released'] }
        })
            .populate('providerId', 'name')
            .populate('customerId', 'name')
            .select('serviceCategory providerId customerId status');

        const latestMessages = await Promise.all(bookings.map(async (booking) => {
            const latestMessage = await Message.findOne({
                bookingId: booking._id,
                senderId: { $ne: req.user.id }
            }).sort({ createdAt: -1 });

            if (!latestMessage) return null;

            const otherParty = req.user.role === 'provider'
                ? booking.customerId?.name || 'Customer'
                : booking.providerId?.name || 'Provider';

            return {
                bookingId: booking._id,
                serviceCategory: booking.serviceCategory,
                otherParty,
                message: latestMessage.message || 'Voice message',
                audioUrl: latestMessage.audioUrl || '',
                createdAt: latestMessage.createdAt
            };
        }));

        return res.status(200).send(latestMessages.filter(Boolean));
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const UpdateBookingStatus = async (req, res) => {
    try {
        const { status, paymentStatus, customerCompletionConfirmed } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        const isProviderOwner = req.user.role === 'provider' && booking.providerId.toString() === req.user.id;
        if (status === 'Accepted' && isProviderOwner) {
            const provider = await Provider.findById(req.user.id);
            if (provider && provider.sandboxBankAccount?.isSetupComplete !== true) {
                return res.status(403).send({ Message: "Please complete your profile before accepting bookings.", success: false });
            }
        }
        const isCustomerOwner = booking.customerId.toString() === req.user.id;

        if (!isProviderOwner && !isCustomerOwner && req.user.role !== 'admin') {
            return res.status(403).send({ Message: "Not allowed to update this booking", success: false });
        }

        if (status && ['In-Progress', 'Completed'].includes(status) && !['Paid', 'Released'].includes(booking.paymentStatus)) {
            return res.status(400).send({ Message: "Payment must be completed before work can start or complete", success: false });
        }

        if (status === 'Completed') {
            return res.status(400).send({ Message: "Please submit completion proof photo to complete the work", success: false });
        }

        if (status) {
            if (status === 'Accepted') {
                if (!(['Requested', 'Negotiation'].includes(booking.status) && isCustomerOwner) && !isProviderOwner && req.user.role !== 'admin') {
                    return res.status(403).send({ Message: "Only the assigned provider or customer can accept this booking", success: false });
                }
                if (isProviderOwner && req.user.role !== 'admin') {
                    const provider = await Provider.findById(req.user.id);
                    if (!provider || !provider.category || !provider.experience || !provider.charges || !provider.sandboxBankAccount?.isSetupComplete) {
                        return res.status(403).send({ Message: "Please complete your profile details (Category, Experience, Charges, and Bank Account) to accept bookings.", success: false });
                    }
                }
            } else if (status === 'Negotiation') {
                if (!(['Requested', 'Negotiation'].includes(booking.status) && isCustomerOwner) && req.user.role !== 'admin') {
                    return res.status(403).send({ Message: "Only the customer can move this booking into negotiation", success: false });
                }
            } else if (status === 'In-Progress') {
                if (!isProviderOwner && req.user.role !== 'admin') {
                    return res.status(403).send({ Message: "Only the assigned provider can start work", success: false });
                }
            }
        }

        let paymentReleaseWebhookPayload = null;
        let responseMessage = "Booking updated successfully";

        const statusBecameAccepted = status === 'Accepted' && booking.status !== 'Accepted';

        if (status) booking.status = status;
        if (customerCompletionConfirmed !== undefined) {
            if (customerCompletionConfirmed !== true) {
                return res.status(400).send({ Message: "Invalid completion confirmation", success: false });
            }
            if (!isCustomerOwner) {
                return res.status(403).send({ Message: "Only the customer can confirm completed work", success: false });
            }
            if (booking.status !== 'Completed') {
                return res.status(400).send({ Message: "Provider must complete the work before customer confirmation", success: false });
            }
            if (!booking.completionPhoto) {
                return res.status(400).send({ Message: "Completion proof photo is required before customer confirmation", success: false });
            }

            booking.customerCompletionConfirmed = true;
            booking.customerCompletedAt = booking.customerCompletedAt || new Date();
            booking.customerCompletedBy = booking.customerCompletedBy || req.user.id;

            if (booking.paymentStatus === 'Paid') {
                const releaseResult = await releaseProviderPayment(booking, { releasedBy: req.user.id });
                paymentReleaseWebhookPayload = releaseResult.webhookPayload;
                if (releaseResult.released) {
                    responseMessage = "Work confirmed and payment transferred to provider.";
                }
            }
        }
        if (paymentStatus) {
            if (paymentStatus === 'Released') {
                if (req.user.role !== 'admin') {
                    return res.status(403).send({ Message: "Only admin can release payment after reviewing completed work", success: false });
                }
                const releaseResult = await releaseProviderPayment(booking, {
                    releasedBy: req.user.id,
                    providerAccountNumber: req.body.providerAccountNumber
                });
                paymentReleaseWebhookPayload = releaseResult.webhookPayload;
                responseMessage = releaseResult.released
                    ? "Payment released to provider."
                    : "Payment was already released.";
            } else {
                if (!isCustomerOwner && req.user.role !== 'admin') {
                    return res.status(403).send({ Message: "Only the customer can update payment status", success: false });
                }
                if (paymentStatus === 'Paid' && req.user.role !== 'admin') {
                    return res.status(400).send({ Message: "Please complete payment through Safepay", success: false });
                }
                if (paymentStatus === 'Paid' && booking.status !== 'Accepted') {
                    return res.status(400).send({ Message: "Payment is available after provider accepts the booking", success: false });
                }
                booking.paymentStatus = paymentStatus;
            }
        }
        await booking.save();

        if (statusBecameAccepted) {
            const bookingForEmail = await Booking.findById(booking._id).populate('providerId', 'email name').populate('customerId', 'email name');
            if (bookingForEmail) {
                sendBookingAcceptedNotification(
                    bookingForEmail.customerId?.email,
                    bookingForEmail.providerId?.email,
                    {
                        customerName: bookingForEmail.customerId?.name || 'Customer',
                        providerName: bookingForEmail.providerId?.name || 'Provider',
                        serviceCategory: bookingForEmail.serviceCategory,
                        charges: bookingForEmail.charges
                    }
                );
            }
        }

        if (paymentReleaseWebhookPayload) {
            sendPaymentReleaseWebhook(paymentReleaseWebhookPayload);
        }

        return res.status(200).send({ Message: responseMessage, booking, success: true });
    } catch (error) {
        if (!error.status || error.status >= 500) {
            console.log(error);
        }
        return res.status(error.status || 500).send({ Message: error.message || "Internal server error", success: false });
    }
};

export const CompleteBookingWithProof = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        const isProviderOwner = req.user.role === 'provider' && booking.providerId.toString() === req.user.id;
        if (!isProviderOwner) {
            return res.status(403).send({ Message: "Only the assigned provider can submit completion proof", success: false });
        }

        if (booking.status !== 'In-Progress') {
            return res.status(400).send({ Message: "Work can be completed only after it is in progress", success: false });
        }

        if (!['Paid', 'Released'].includes(booking.paymentStatus)) {
            return res.status(400).send({ Message: "Payment must be completed before submitting completed work", success: false });
        }

        if (!req.file) {
            return res.status(400).send({ Message: "Please upload a completion proof photo", success: false });
        }

        const uploadedImage = await uploadImageBuffer(req.file.buffer, 'proconnect/completion-proof');
        booking.completionPhoto = uploadedImage.secure_url;
        booking.status = 'Completed';
        booking.customerCompletionConfirmed = false;
        booking.customerCompletedAt = undefined;
        booking.customerCompletedBy = undefined;
        await booking.save();

        const bookingForEmail = await Booking.findById(booking._id).populate('providerId', 'name').populate('customerId', 'email name');
        if (bookingForEmail?.customerId?.email) {
            sendWorkCompletedNotification(bookingForEmail.customerId.email, {
                customerName: bookingForEmail.customerId.name || 'Customer',
                providerName: bookingForEmail.providerId?.name || 'Provider',
                serviceCategory: bookingForEmail.serviceCategory
            });
        }

        return res.status(200).send({ Message: "Completion proof submitted. Waiting for customer confirmation.", booking, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: error.message || "Unable to submit completion proof", success: false });
    }
};

export const CreateSafepayCheckout = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('customerId', 'name email')
            .populate('providerId', 'name');

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        if (booking.customerId?._id?.toString() !== req.user.id) {
            return res.status(403).send({ Message: "Only the customer can pay for this booking", success: false });
        }

        if (booking.status !== 'Accepted') {
            return res.status(400).send({ Message: "Payment is available after provider accepts the booking", success: false });
        }

        if (booking.paymentStatus === 'Paid') {
            return res.status(400).send({ Message: "This booking is already paid", success: false });
        }

        const safepay = getSafepayClient();
        const amount = Math.round(Number(booking.charges || 0) * 100);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).send({ Message: "Booking charges are missing", success: false });
        }

        const session = await safepay.payments.session.setup({
            merchant_api_key: process.env.SAFEPAY_API_KEY,
            mode: 'payment',
            currency: 'PKR',
            amount,
            description: `${booking.serviceCategory} service - Order #${booking._id.toString().slice(-8)}`,
            customer_email: booking.customerId?.email || 'customer@proconnect.pk',
            customer_name: booking.customerId?.name || 'Customer',
            metadata: {
                order_id: booking._id.toString(),
                source: 'proconnect'
            }
        });

        // Debug: log important fields from session (avoid logging secrets)
        try {
            console.log('Safepay session:', {
                ok: Boolean(session),
                tracker: session?.data?.tracker || null,
                state: session?.data?.state || null
            });
        } catch (e) {
            console.error('Safepay session logging failed:', e?.message || e);
        }

        const tracker = getSafepayTrackerToken(session);

        if (!tracker) {
            return res.status(502).send({ Message: "Safepay did not return a tracker", success: false });
        }

        const passport = await safepay.client.passport.create();
        // Debug: log presence of passport token
        try {
            console.log('Safepay passport token exists:', Boolean(getSafepayPassportToken(passport)));
        } catch (e) {
            console.error('Safepay passport logging failed:', e?.message || e);
        }

        const tbt = getSafepayPassportToken(passport);
        const clientUrl = resolveClientUrl(req);
        const checkoutUrl = safepay.checkout.createCheckoutUrl({
            env: SAFEPAY_ENV,
            tracker,
            tbt,
            source: 'hosted',
            order_id: booking._id.toString(),
            redirect_url: `${clientUrl}/payment-success`,
            cancel_url: `${clientUrl}/payment-cancel`
        });

        booking.safepay = { tracker, state: 'TRACKER_CREATED' };
        await booking.save();

        return res.status(200).send({ checkoutUrl, tracker, success: true });
    } catch (error) {
        console.error("Safepay checkout error:", {
            message: error?.message,
            status: error?.status,
            response: error?.response?.data || error?.data || null,
            stack: error?.stack
        });
        return res.status(500).send({ Message: error.message || "Unable to start Safepay checkout", success: false });
    }
};

export const ConfirmSafepayPayment = async (req, res) => {
    try {
        const { tracker } = req.query;
        if (!tracker) {
            return res.status(400).send({ Message: "Safepay tracker is required", success: false });
        }

        const booking = await Booking.findOne({ 'safepay.tracker': tracker });
        if (!booking) {
            return res.status(404).send({ Message: "Booking not found for this payment", success: false });
        }

        if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).send({ Message: "Not allowed to confirm this payment", success: false });
        }

        const safepay = getSafepayClient();
        const response = await safepay.reporter.payments.fetch(tracker);
        const state = getSafepayTrackerState(response);
        const failureDetails = getSafepayFailureDetails(response);

        booking.safepay = {
            ...booking.safepay,
            tracker,
            state
        };

        if (SAFEPAY_SUCCESS_STATES.has(state)) {
            booking.paymentStatus = 'Paid';
            booking.safepay.paidAt = new Date();
            
            const bookingForEmail = await Booking.findById(booking._id).populate('providerId', 'email').populate('customerId', 'name');
            if (bookingForEmail?.providerId?.email) {
                sendPaymentReceivedNotification(bookingForEmail.providerId.email, {
                    customerName: bookingForEmail.customerId?.name || 'Customer',
                    serviceCategory: bookingForEmail.serviceCategory,
                    charges: bookingForEmail.charges
                });
            }
        }

        if (isSafepayFailureState(state)) {
            booking.paymentStatus = 'Pending';
            booking.safepay.failedAt = new Date();
            booking.safepay.failureAction = failureDetails.action;
            booking.safepay.failureReason = failureDetails.reason || state;
            await booking.save();

            return res.status(402).send({
                Message: buildSafepayFailureMessage(failureDetails),
                booking,
                paymentConfirmed: false,
                retryable: true,
                state,
                success: false
            });
        }

        await booking.save();

        return res.status(200).send({
            Message: SAFEPAY_SUCCESS_STATES.has(state) ? "Payment confirmed. Chat is now available." : "Payment is still processing.",
            booking,
            paymentConfirmed: SAFEPAY_SUCCESS_STATES.has(state),
            state,
            success: true
        });
    } catch (error) {
        const failureDetails = getSafepayFailureDetails(error);
        if (isPayerAuthFailure(failureDetails)) {
            try {
                const tracker = req.query?.tracker;
                await Booking.findOneAndUpdate(
                    { 'safepay.tracker': tracker },
                    {
                        $set: {
                            paymentStatus: 'Pending',
                            'safepay.state': 'PAYER_AUTH_FAILED',
                            'safepay.failedAt': new Date(),
                            'safepay.failureAction': failureDetails.action || 'PAYER_AUTH_ENROLLMENT',
                            'safepay.failureReason': failureDetails.reason
                        }
                    }
                );
            } catch (saveError) {
                console.error("Unable to save Safepay failure details:", saveError?.message || saveError);
            }

            return res.status(402).send({
                Message: buildSafepayFailureMessage(failureDetails),
                paymentConfirmed: false,
                retryable: true,
                state: 'PAYER_AUTH_FAILED',
                success: false
            });
        }

        console.log(error);
        return res.status(500).send({ Message: error.message || "Unable to confirm Safepay payment", success: false });
    }
};

export const DeleteBookingRequest = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking request not found", success: false });
        }

        const isCustomerOwner = booking.customerId.toString() === req.user.id;
        if (!isCustomerOwner && req.user.role !== 'admin') {
            return res.status(403).send({ Message: "You can delete only your own booking request", success: false });
        }

        if (!['Requested', 'Negotiation'].includes(booking.status) && req.user.role !== 'admin') {
            return res.status(400).send({ Message: "Accepted bookings cannot be deleted. Please contact the provider or cancel the service.", success: false });
        }

        await Message.deleteMany({ bookingId: booking._id });
        await Booking.findByIdAndDelete(booking._id);

        return res.status(200).send({ Message: "Booking request deleted successfully", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const DeleteAllBookings = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).send({ Message: "Only admin can delete all bookings", success: false });
        }

        const bookings = await Booking.find({}).select('_id');
        const bookingIds = bookings.map((booking) => booking._id);

        if (bookingIds.length === 0) {
            return res.status(200).send({ Message: "No bookings to delete", deletedCount: 0, success: true });
        }

        const removedReviews = await Review.find({ bookingId: { $in: bookingIds } }).select('providerId');
        const affectedProviderIds = [
            ...new Set(removedReviews.map((review) => review.providerId?.toString()).filter(Boolean))
        ];

        await Promise.all([
            Message.deleteMany({ bookingId: { $in: bookingIds } }),
            Review.deleteMany({ bookingId: { $in: bookingIds } }),
            Booking.deleteMany({ _id: { $in: bookingIds } })
        ]);

        await Promise.all(affectedProviderIds.map(async (providerId) => {
            const stats = await Review.aggregate([
                { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
                { $group: { _id: '$providerId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);

            await Provider.findByIdAndUpdate(providerId, {
                ratingAverage: stats[0] ? Number(stats[0].average.toFixed(1)) : DEFAULT_NEW_PROVIDER_RATING,
                ratingCount: stats[0]?.count || 0
            });
        }));

        return res.status(200).send({
            Message: `Deleted ${bookingIds.length} booking${bookingIds.length === 1 ? '' : 's'} successfully`,
            deletedCount: bookingIds.length,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

const canUseBookingChat = (booking, user) => {
    const isCustomer = booking.customerId.toString() === user.id;
    const isProvider = booking.providerId.toString() === user.id;
    return (isCustomer || isProvider || user.role === 'admin')
        && booking.status === 'Accepted'
        && ['Paid', 'Released'].includes(booking.paymentStatus);
};

export const GetBookingMessages = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        if (!canUseBookingChat(booking, req.user)) {
            return res.status(403).send({ Message: "Chat is available after the provider accepts the booking and payment is completed", success: false });
        }

        const messages = await Message.find({ bookingId: booking._id }).sort({ createdAt: 1 });
        return res.status(200).send(messages);
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const SendBookingMessage = async (req, res) => {
    try {
        const { message = '' } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        if (!canUseBookingChat(booking, req.user)) {
            return res.status(403).send({ Message: "Chat is available after the provider accepts the booking and payment is completed", success: false });
        }

        let audioUrl = '';
        let audioPublicId = '';

        if (req.file) {
            try {
                const uploadedAudio = await uploadAudioBuffer(req.file.buffer);
                audioUrl = uploadedAudio.secure_url;
                audioPublicId = uploadedAudio.public_id;
            } catch (uploadError) {
                console.log("Voice message upload failed:", uploadError.message);
                return res.status(500).send({
                    Message: uploadError.message || "Voice message upload failed",
                    success: false
                });
            }
        }

        if (!message.trim() && !audioUrl) {
            return res.status(400).send({ Message: "Message or voice note is required", success: false });
        }

        const createdMessage = await Message.create({
            bookingId: booking._id,
            senderId: req.user.id,
            senderRole: req.user.role,
            message: message.trim(),
            audioUrl,
            audioPublicId
        });

        return res.status(201).send({ Message: "Message sent", chatMessage: createdMessage, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const ReviewBooking = async (req, res) => {
    try {
        const { rating, comment = '' } = req.body;
        const numericRating = Number(rating);

        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).send({ Message: "Rating must be between 1 and 5", success: false });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        if (booking.customerId.toString() !== req.user.id) {
            return res.status(403).send({ Message: "You can review only your own booking", success: false });
        }

        if (booking.status !== 'Completed') {
            return res.status(400).send({ Message: "You can review after the booking is completed", success: false });
        }

        if (!booking.customerCompletionConfirmed) {
            return res.status(400).send({ Message: "Please confirm the completed work before reviewing", success: false });
        }

        const existingReview = await Review.findOne({ bookingId: booking._id });
        if (existingReview) {
            return res.status(409).send({ Message: "You already reviewed this booking", success: false });
        }

        const review = await Review.create({
            bookingId: booking._id,
            providerId: booking.providerId,
            customerId: req.user.id,
            rating: numericRating,
            comment: comment.trim()
        });

        const stats = await Review.aggregate([
            { $match: { providerId: booking.providerId } },
            { $group: { _id: '$providerId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        await Provider.findByIdAndUpdate(booking.providerId, {
            ratingAverage: stats[0] ? Number(stats[0].average.toFixed(1)) : 0,
            ratingCount: stats[0]?.count || 0
        });

        return res.status(201).send({ Message: "Review submitted successfully", review, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const AdjustBookingAmount = async (req, res) => {
    try {
        const { newAmount, reason } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking not found", success: false });
        }

        const isProviderOwner = req.user.role === 'provider' && booking.providerId.toString() === req.user.id;
        const isCustomerOwner = req.user.role === 'user' && booking.customerId.toString() === req.user.id;
        if (!isProviderOwner && !isCustomerOwner) {
            return res.status(403).send({ Message: "Only the assigned provider or customer can adjust the amount", success: false });
        }

        // Can only adjust before work starts
        if (booking.status !== 'Accepted') {
            return res.status(400).send({ Message: "Amount can only be adjusted after provider accepts the booking and before starting work", success: false });
        }

        // Validate new amount
        const amount = Number(newAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).send({ Message: "Amount must be a valid positive number", success: false });
        }

        const provider = await Provider.findById(booking.providerId).select('charges');
        const providerBaseCharges = provider ? (provider.charges || 1000) : 1000;

        if (isProviderOwner && amount < providerBaseCharges) {
            return res.status(400).send({ Message: `You cannot offer a fare lower than your base charges (Rs. ${providerBaseCharges})`, success: false });
        }

        if (isCustomerOwner && amount < providerBaseCharges) {
            return res.status(400).send({ Message: `You cannot offer a fare lower than the provider's base charges (Rs. ${providerBaseCharges})`, success: false });
        }

        if (isCustomerOwner && amount >= booking.charges) {
            return res.status(400).send({ Message: "Counteroffer must be lower than the current offer", success: false });
        }

        // Store history of amount change
        if (!Array.isArray(booking.chargesHistory)) {
            booking.chargesHistory = [];
        }

        booking.chargesHistory.push({
            previousAmount: booking.charges,
            newAmount: amount,
            reason: reason || 'No reason provided',
            updatedBy: req.user.id,
            updatedAt: new Date()
        });

        const previousAmount = booking.charges;
        booking.charges = amount;
        booking.paymentStatus = 'Pending';
        if (['Requested', 'Accepted', 'Negotiation'].includes(booking.status)) {
            booking.status = 'Negotiation';
        }

        await booking.save();

        return res.status(200).send({
            Message: `Amount adjusted from ${previousAmount} to ${amount} successfully`,
            booking,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};
export const DeclineBookingRequest = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).send({ Message: "Booking request not found", success: false });
        }

        const isCustomerOwner = booking.customerId.toString() === req.user.id;
        const isProviderOwner = booking.providerId.toString() === req.user.id;
        if (!isCustomerOwner && !isProviderOwner && req.user.role !== "admin") {
            return res.status(403).send({ Message: "Not allowed", success: false });
        }

        booking.status = "Negotiation";
        booking.chargesHistory.push({
            previousAmount: booking.charges,
            newAmount: booking.charges,
            reason: "Offer declined by " + (isCustomerOwner ? "customer" : "provider"),
            updatedBy: req.user.id,
            updatedAt: new Date()
        });
        await booking.save();

        return res.status(200).send({ Message: "Booking request declined, waiting for new offer.", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};
