import User from '../Model/User.js';
import Provider from '../Model/Provider.js';

export const sanitizeCnic = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/[^0-9]/g, '');
};

export const isValidCnic = (sanitized) => {
    return /^\d{13}$/.test(sanitized);
};

export const validateAndSanitize = (raw) => {
    const sanitized = sanitizeCnic(raw);
    if (!sanitized) {
        return { sanitized: '', isValid: false, error: 'CNIC is required' };
    }
    if (!isValidCnic(sanitized)) {
        return { sanitized, isValid: false, error: 'CNIC must be exactly 13 digits' };
    }
    return { sanitized, isValid: true, error: null };
};

export const checkCnicUniqueness = async (sanitizedCnic, excludeId = null, excludeModel = null) => {
    if (!sanitizedCnic) return { isUnique: true, conflictCollection: null, conflictId: null };

    const userConflict = await User.findOne({
        cnic: sanitizedCnic,
        ...(excludeModel === 'user' && excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id');

    if (userConflict) {
        return { isUnique: false, conflictCollection: 'user', conflictId: userConflict._id };
    }

    const providerConflict = await Provider.findOne({
        cnic: sanitizedCnic,
        ...(excludeModel === 'provider' && excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id');

    if (providerConflict) {
        return { isUnique: false, conflictCollection: 'provider', conflictId: providerConflict._id };
    }

    return { isUnique: true, conflictCollection: null, conflictId: null };
};
