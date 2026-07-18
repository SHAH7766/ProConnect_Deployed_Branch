const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const configuredApiUrl = import.meta.env.VITE_APP_URL?.trim();

const resolveApiBaseUrl = () => {
  if (!configuredApiUrl) {
    return DEFAULT_API_URL;
  }

  if (configuredApiUrl.includes('proconnect-production-c80e.up.railway.app')) {
    return DEFAULT_API_URL;
  }

  return configuredApiUrl.replace(/\/$/, '');
};

export const API_BASE_URL = resolveApiBaseUrl();
