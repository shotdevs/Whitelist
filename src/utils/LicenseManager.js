import axios from 'axios';

export default class LicenseManager {
    constructor(baseUrl, clientId) {
        this.baseUrl = baseUrl;
        this.clientId = clientId;
    }

    async verifyLicense(licenseKey) {
        if (!licenseKey || !this.clientId || !this.baseUrl) {
            return { success: false, message: 'License key, client ID, or API URL is not configured.' };
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/license/verify`, {
                licenseKey: licenseKey,
                clientId: this.clientId
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Verification failed due to a network or server error.';
            return { success: false, message: errorMessage };
        }
    }
}
