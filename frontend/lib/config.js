export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // If we are in the browser, allow dynamic hostname for local dev, or use ENV for production
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`;
        console.log("API URL configured as:", apiUrl);
        return apiUrl;
    }
    // Server-side default
    // Server-side default: Use localhost if not defined
    return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
};
