import { httpAuth } from '../index.js';

const { BasicAuth, BearerAuth } = httpAuth;

describe('Authentication Classes', () => {
    describe('BasicAuth', () => {
        test('should create BasicAuth instance with credentials', () => {
            const auth = new BasicAuth({
                username: 'testuser',
                password: 'testpass'
            });

            expect(auth.username).toBe('testuser');
            expect(auth.password).toBe('testpass');
        });

        test('should generate correct authorization header', () => {
            const auth = new BasicAuth({
                username: 'testuser',
                password: 'testpass'
            });

            const header = auth.getAuthorizationHeader();
            const expectedToken = Buffer.from('testuser:testpass').toString('base64');
            expect(header).toBe(`Basic ${expectedToken}`);
        });

        test('should return null for empty username', () => {
            const auth = new BasicAuth({
                username: '',
                password: 'testpass'
            });

            expect(auth.getAuthorizationHeader()).toBeNull();
        });

        test('should return null for empty password', () => {
            const auth = new BasicAuth({
                username: 'testuser',
                password: ''
            });

            expect(auth.getAuthorizationHeader()).toBeNull();
        });

        test('should return null for non-string credentials', () => {
            const auth = new BasicAuth({
                username: null,
                password: 'testpass'
            });

            expect(auth.getAuthorizationHeader()).toBeNull();
        });
    });

    describe('BearerAuth', () => {
        test('should create BearerAuth instance with options', () => {
            const auth = new BearerAuth({
                url: 'https://api.example.com/token',
                tokenKey: 'access_token',
                requestOptions: { form: { grant_type: 'client_credentials' } }
            });

            expect(auth.url).toBe('https://api.example.com/token');
            expect(auth.tokenKey).toBe('access_token');
            expect(auth.requestOptions).toEqual({ form: { grant_type: 'client_credentials' } });
            expect(auth.mayRequireRenewal).toBe(true);
        });

        test('should use default values', () => {
            const auth = new BearerAuth({});

            expect(auth.tokenKey).toBe('token');
            expect(auth.token).toBeNull();
            expect(auth.url).toBeNull();
            expect(auth.logger).toBe(console);
            expect(auth.mayRequireRenewal).toBe(true);
        });

        test('should return authorization header with existing token', async () => {
            const auth = new BearerAuth({});
            auth.token = 'existing-token';

            const header = await auth.getAuthorizationHeader({});
            expect(header).toBe('Bearer existing-token');
        });

        test('should return null when no token and invalid config', async () => {
            const auth = new BearerAuth({});

            const header = await auth.getAuthorizationHeader({});
            expect(header).toBeNull();
        });

        test('should clear token when renew is true', async () => {
            const auth = new BearerAuth({});
            auth.token = 'existing-token';

            // Mock getToken to return null (simulating failed renewal)
            auth.getToken = () => Promise.resolve(null);

            const header = await auth.getAuthorizationHeader({ renew: true });
            expect(auth.token).toBeNull();
            expect(header).toBeNull();
        });

        test('should return null from getToken when missing config', async () => {
            const auth = new BearerAuth({});
            const token = await auth.getToken();
            expect(token).toBeUndefined();
        });

        test('should return null from getToken when missing requestOptions', async () => {
            const auth = new BearerAuth({
                url: 'https://api.example.com/token',
                tokenKey: 'access_token'
            });
            const token = await auth.getToken();
            expect(token).toBeUndefined();
        });

        test('should return null from getToken when missing url', async () => {
            const auth = new BearerAuth({
                tokenKey: 'access_token',
                requestOptions: { form: { grant_type: 'client_credentials' } }
            });
            const token = await auth.getToken();
            expect(token).toBeUndefined();
        });

        test('should return null from getToken when missing tokenKey', async () => {
            const auth = new BearerAuth({
                url: 'https://api.example.com/token',
                requestOptions: { form: { grant_type: 'client_credentials' } }
            });
            auth.tokenKey = null;
            const token = await auth.getToken();
            expect(token).toBeUndefined();
        });
    });
});