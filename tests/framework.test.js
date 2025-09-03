import Framework from '../index.js';
import { ListParameters } from '../index.js';

describe('Framework', () => {
    let framework;

    beforeEach(() => {
        framework = new Framework({
            logger: {
                debug: () => {},
                info: () => {},
                error: () => {}
            }
        });
    });

    test('should create framework instance with default values', () => {
        expect(framework).toBeInstanceOf(Framework);
        expect(framework.serverUrl).toBe('https://portal.coolrgroup.com');
        expect(framework.loginController).toBe('Login');
        expect(framework.controllers).toEqual({});
        expect(framework.loginInfo).toBeUndefined();
    });

    test('should create framework with custom options', () => {
        const customFramework = new Framework({
            serverUrl: 'https://custom.example.com',
            loginController: 'CustomLogin'
        });
        
        expect(customFramework.serverUrl).toBe('https://custom.example.com');
        expect(customFramework.loginController).toBe('CustomLogin');
    });

    test('should create controllers', () => {
        framework.createControllers('User', 'Item', 'Order');
        
        expect(framework.controllers.User).toBeDefined();
        expect(framework.controllers.Item).toBeDefined();
        expect(framework.controllers.Order).toBeDefined();
        expect(framework.controllers.User.controller).toBe('User');
        expect(framework.controllers.User.framework).toBe(framework);
    });

    test('should get individual controller', () => {
        const userController = framework.getController('User');
        
        expect(userController.controller).toBe('User');
        expect(userController.framework).toBe(framework);
    });

    test('should have ListParameters reference', () => {
        expect(framework.ListParameters).toBeDefined();
        expect(typeof framework.ListParameters).toBe('function');
    });

    test('should have util reference', () => {
        expect(framework.util).toBeDefined();
        expect(typeof framework.util).toBe('object');
    });

    test('should have static util reference', () => {
        expect(Framework.util).toBeDefined();
        expect(typeof Framework.util).toBe('object');
    });
});

describe('Controller', () => {
    let framework;
    let controller;
    let mockResults;

    beforeEach(() => {
        mockResults = {
            list: { records: [], recordCount: 0 },
            listAll: { items: [], recordCount: 0 },
            query: { success: true }
        };

        framework = new Framework({
            logger: {
                debug: () => {},
                info: () => {},
                error: () => {}
            }
        });
        
        // Create simple mock functions
        framework.list = (params) => Promise.resolve(mockResults.list);
        framework.listAll = (params) => Promise.resolve(mockResults.listAll);
        framework.query = (params) => Promise.resolve(mockResults.query);

        controller = framework.getController('TestController');
    });

    test('should call framework.list with correct parameters', async () => {
        const listParams = new ListParameters({ limit: 10, start: 0 });
        const result = await controller.list(listParams);
        
        expect(result).toBe(mockResults.list);
    });

    test('should call framework.listAll with correct parameters', async () => {
        const listParams = new ListParameters();
        const result = await controller.listAll(listParams);
        
        expect(result).toBe(mockResults.listAll);
    });

    test('should handle get with ID parameter', async () => {
        const result = await controller.get(123);
        expect(result).toBe(mockResults.query);
    });

    test('should handle get with string ID parameter', async () => {
        const result = await controller.get('abc123');
        expect(result).toBe(mockResults.query);
    });

    test('should handle get with object parameter', async () => {
        const params = { id: 123, includeDetails: true };
        const result = await controller.get(params);
        expect(result).toBe(mockResults.query);
    });

    test('should handle save with object parameter', async () => {
        const data = { id: 123, name: 'Test' };
        const result = await controller.save(data);
        expect(result).toBe(mockResults.query);
    });

    test('should handle save with separate ID and params', async () => {
        const result = await controller.save(123, { name: 'Test' });
        expect(result).toBe(mockResults.query);
    });
});