import Framework from '../index.js';
import { util } from '../index.js';

describe('Input Validation Tests', () => {
    describe('Framework validation', () => {
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

        test('should throw error for invalid login credentials', async () => {
            await expect(framework.login()).rejects.toThrow('Credentials object is required for login');
            await expect(framework.login(null)).rejects.toThrow('Credentials object is required for login');
            await expect(framework.login('invalid')).rejects.toThrow('Credentials object is required for login');
        });

        test('should throw error for missing username', async () => {
            await expect(framework.login({})).rejects.toThrow('Username is required and must be a string');
            await expect(framework.login({ username: '' })).rejects.toThrow('Username is required and must be a string');
            await expect(framework.login({ username: null })).rejects.toThrow('Username is required and must be a string');
            await expect(framework.login({ username: 123 })).rejects.toThrow('Username is required and must be a string');
        });

        test('should throw error for missing password', async () => {
            await expect(framework.login({ username: 'test' })).rejects.toThrow('Password is required and must be a string');
            await expect(framework.login({ username: 'test', password: '' })).rejects.toThrow('Password is required and must be a string');
            await expect(framework.login({ username: 'test', password: null })).rejects.toThrow('Password is required and must be a string');
            await expect(framework.login({ username: 'test', password: 123 })).rejects.toThrow('Password is required and must be a string');
        });

        test('should throw error for invalid controller name in getController', () => {
            expect(() => framework.getController()).toThrow('Controller name must be a non-empty string');
            expect(() => framework.getController('')).toThrow('Controller name must be a non-empty string');
            expect(() => framework.getController(null)).toThrow('Controller name must be a non-empty string');
            expect(() => framework.getController(123)).toThrow('Controller name must be a non-empty string');
        });

        test('should throw error for invalid controller names in createControllers', () => {
            expect(() => framework.createControllers()).toThrow('At least one controller name must be provided');
            expect(() => framework.createControllers('')).toThrow('Controller name must be a non-empty string');
            expect(() => framework.createControllers('User', null)).toThrow('Controller name must be a non-empty string');
            expect(() => framework.createControllers('User', 123)).toThrow('Controller name must be a non-empty string');
        });

        test('should create controllers with valid names', () => {
            expect(() => framework.createControllers('User', 'Item')).not.toThrow();
            expect(framework.controllers.User).toBeDefined();
            expect(framework.controllers.Item).toBeDefined();
        });
    });

    describe('Util validation', () => {
        test('should throw error for invalid collection in unique', () => {
            expect(() => util.unique(null, 'name')).toThrow('Collection must be an array');
            expect(() => util.unique('invalid', 'name')).toThrow('Collection must be an array');
            expect(() => util.unique(123, 'name')).toThrow('Collection must be an array');
            expect(() => util.unique({}, 'name')).toThrow('Collection must be an array');
        });

        test('should throw error for invalid key in unique', () => {
            expect(() => util.unique([], null)).toThrow('Key must be a non-empty string');
            expect(() => util.unique([], '')).toThrow('Key must be a non-empty string');
            expect(() => util.unique([], 123)).toThrow('Key must be a non-empty string');
        });

        test('should work with valid parameters in unique', () => {
            const data = [{ name: 'John' }, { name: 'Jane' }, { name: 'John' }];
            expect(() => util.unique(data, 'name')).not.toThrow();
            expect(util.unique(data, 'name')).toEqual(['John', 'Jane']);
        });

        test('should throw error for invalid parameters in join', () => {
            const validLeft = [{ id: 1 }];
            const validRight = [{ userId: 1 }];
            const validJoin = ['id', 'userId'];
            const validColumns = ['name'];

            expect(() => util.join({ left: null, right: validRight, join: validJoin, columns: validColumns }))
                .toThrow('Left array is required and must be an array');
            
            expect(() => util.join({ left: 'invalid', right: validRight, join: validJoin, columns: validColumns }))
                .toThrow('Left array is required and must be an array');

            expect(() => util.join({ left: validLeft, right: null, join: validJoin, columns: validColumns }))
                .toThrow('Right array is required and must be an array');

            expect(() => util.join({ left: validLeft, right: validRight, join: null, columns: validColumns }))
                .toThrow('Join must be an array with exactly 2 elements [leftKey, rightKey]');

            expect(() => util.join({ left: validLeft, right: validRight, join: ['single'], columns: validColumns }))
                .toThrow('Join must be an array with exactly 2 elements [leftKey, rightKey]');

            expect(() => util.join({ left: validLeft, right: validRight, join: validJoin, columns: null }))
                .toThrow('Columns must be a non-empty array');

            expect(() => util.join({ left: validLeft, right: validRight, join: validJoin, columns: [] }))
                .toThrow('Columns must be a non-empty array');
        });

        test('should work with valid parameters in join', () => {
            const users = [{ id: 1, name: 'John' }];
            const roles = [{ userId: 1, role: 'admin' }];
            
            expect(() => util.join({
                left: users,
                right: roles,
                join: ['id', 'userId'],
                columns: ['role']
            })).not.toThrow();

            expect(users[0]).toEqual({ id: 1, name: 'John', role: 'admin' });
        });
    });
});