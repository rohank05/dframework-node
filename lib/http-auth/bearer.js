import got from 'got';

/**
 * Bearer Token Authentication handler for HTTP requests
 * @class BearerAuthentication
 */
class BearerAuthentication {

    /**
     * Creates a new BearerAuthentication instance
     * @param {Object} options - Authentication options
     * @param {string} [options.tokenKey='token'] - The key of the token in the response body
     * @param {string} options.url - The URL of the token endpoint
     * @param {Object} options.requestOptions - The options for the token request (headers, body, etc.)
     * @param {string} [options.token] - Pre-existing token to use (if not provided, will be retrieved from endpoint)
     * @param {Console} [options.logger=console] - Logger instance for error reporting
     * @example
     * const auth = new BearerAuthentication({
     *   url: 'https://api.example.com/token',
     *   tokenKey: 'access_token',
     *   requestOptions: {
     *     form: {
     *       grant_type: 'client_credentials',
     *       client_id: 'myclient',
     *       client_secret: 'mysecret'
     *     }
     *   }
     * });
     */
    constructor(options) {
        Object.assign(this, options);
    }

    /** @type {string|null} Current authentication token */
    token = null

    /** @type {Console} Logger instance for error reporting */
    logger = console

    /** @type {string} Key to extract token from response */
    tokenKey = 'token'

    /** @type {string|null} Token endpoint URL */
    url = null

    /**
     * Indicates whether this authentication method may require token renewal
     * @type {boolean}
     */
    mayRequireRenewal = true

    /**
     * Generates the Authorization header value for bearer authentication
     * @param {Object} [options] - Options for header generation
     * @param {boolean} [options.renew=false] - Whether to force token renewal
     * @returns {Promise<string|null>} Bearer authentication header value or null if token retrieval failed
     * @example
     * const header = await auth.getAuthorizationHeader();
     * // Returns: "Bearer eyJhbGciOiJIUzI1NiIs..."
     * 
     * // Force token renewal
     * const newHeader = await auth.getAuthorizationHeader({ renew: true });
     */
    async getAuthorizationHeader({ renew }) {
        if (renew) {
            this.token = null;
        }
        if (!this.token) {
            this.token = await this.getToken();
        }
        if (this.token) {
            return `Bearer ${this.token}`;
        }
        return null;
    }


    /**
     * Retrieves a new authentication token from the configured endpoint
     * @returns {Promise<string|null>} The authentication token or null if retrieval failed
     * @private
     * @example
     * const token = await auth.getToken();
     */
    async getToken() {
        const { requestOptions, tokenKey, url, logger } = this;
        if (!requestOptions || !tokenKey || !url) {
            return;
        }
        try {
            const result = await got.post(url, requestOptions).json();
            return result[tokenKey];
        } catch (error) {
            logger.error(error.response.body);
            return null;
        }
    }
}

export default BearerAuthentication;