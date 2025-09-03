/**
 * Basic Authentication handler for HTTP requests
 * @class BasicAuthentication
 */
class BasicAuthentication {
    /**
     * Creates a new BasicAuthentication instance
     * @param {Object} options - Authentication options
     * @param {string} options.username - Username for basic authentication
     * @param {string} options.password - Password for basic authentication
     * @example
     * const auth = new BasicAuthentication({
     *   username: 'myuser',
     *   password: 'mypassword'
     * });
     */
    constructor(options) {
        Object.assign(this, options);
    }

    /**
     * Generates the Authorization header value for basic authentication
     * @returns {string|null} Basic authentication header value or null if credentials are invalid
     * @example
     * const header = auth.getAuthorizationHeader();
     * // Returns: "Basic dXNlcm5hbWU6cGFzc3dvcmQ="
     */
    getAuthorizationHeader() {
        const { username, password } = this;
        if (typeof username === 'string' && username.length > 0 && typeof password === 'string' && password.length > 0) {
            return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
        }
        return null;
    }
}

export default BasicAuthentication;