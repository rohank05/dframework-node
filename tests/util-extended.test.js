import { util } from '../index.js';

describe('util functions', () => {
    describe('isMacAddress', () => {
        test('should validate correct MAC addresses', () => {
            expect(util.isMacAddress('00:1B:44:11:3A:B7')).toBe(true);
            expect(util.isMacAddress('00-1B-44-11-3A-B7')).toBe(true);
            expect(util.isMacAddress('FF:FF:FF:FF:FF:FF')).toBe(true);
        });

        test('should reject invalid MAC addresses', () => {
            expect(util.isMacAddress('invalid')).toBe(false);
            expect(util.isMacAddress('00:1B:44:11:3A')).toBe(false);
            expect(util.isMacAddress('GG:1B:44:11:3A:B7')).toBe(false);
            expect(util.isMacAddress(null)).toBe(false);
            expect(util.isMacAddress(undefined)).toBe(false);
            expect(util.isMacAddress(123)).toBe(false);
        });
    });

    describe('unique', () => {
        test('should extract unique values from array of objects', () => {
            const data = [
                { name: 'John', age: 25 },
                { name: 'Jane', age: 30 },
                { name: 'John', age: 35 },
                { name: 'Bob', age: 25 }
            ];
            
            expect(util.unique(data, 'name')).toEqual(['John', 'Jane', 'Bob']);
            expect(util.unique(data, 'age')).toEqual([25, 30, 35]);
        });

        test('should handle empty array', () => {
            expect(util.unique([], 'name')).toEqual([]);
        });
    });

    describe('join', () => {
        test('should perform left join on arrays', () => {
            const users = [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' },
                { id: 3, name: 'Bob' }
            ];
            const roles = [
                { userId: 1, role: 'admin' },
                { userId: 2, role: 'user' }
                // Note: no role for Bob (id: 3)
            ];

            util.join({
                left: users,
                right: roles,
                join: ['id', 'userId'],
                columns: ['role']
            });

            expect(users[0]).toEqual({ id: 1, name: 'John', role: 'admin' });
            expect(users[1]).toEqual({ id: 2, name: 'Jane', role: 'user' });
            expect(users[2]).toEqual({ id: 3, name: 'Bob', role: undefined });
        });

        test('should handle multiple columns', () => {
            const users = [{ id: 1, name: 'John' }];
            const details = [{ userId: 1, role: 'admin', department: 'IT' }];

            util.join({
                left: users,
                right: details,
                join: ['id', 'userId'],
                columns: ['role', 'department']
            });

            expect(users[0]).toEqual({
                id: 1,
                name: 'John',
                role: 'admin',
                department: 'IT'
            });
        });

        test('should handle null/undefined values', () => {
            const users = [
                { id: 1, name: 'John' },
                { id: null, name: 'Jane' },
                { name: 'Bob' } // no id property
            ];
            const roles = [{ userId: 1, role: 'admin' }];

            util.join({
                left: users,
                right: roles,
                join: ['id', 'userId'],
                columns: ['role']
            });

            expect(users[0]).toEqual({ id: 1, name: 'John', role: 'admin' });
            expect(users[1]).toEqual({ id: null, name: 'Jane', role: undefined });
            expect(users[2]).toEqual({ name: 'Bob', role: undefined });
        });
    });

    describe('safeDate', () => {
        test('should return valid dates unchanged', () => {
            const date = new Date(2023, 0, 15);
            expect(util.safeDate(date)).toBe(date);
        });

        test('should return default date for null', () => {
            const result = util.safeDate(null);
            expect(result).toEqual(new Date(2000, 0, 1));
        });

        test('should return default date for non-date objects', () => {
            expect(util.safeDate('invalid')).toEqual(new Date(2000, 0, 1));
            expect(util.safeDate(123)).toEqual(new Date(2000, 0, 1));
            expect(util.safeDate({})).toEqual(new Date(2000, 0, 1));
        });

        test('should use custom default date', () => {
            const customDefault = new Date(2023, 5, 15);
            const result = util.safeDate(null, customDefault);
            expect(result).toBe(customDefault);
        });
    });

    describe('replaceTags', () => {
        test('should replace simple tags', () => {
            const template = 'Hello ${name}!';
            const values = { name: 'John' };
            const result = util.replaceTags(template, values);
            expect(result).toBe('Hello John!');
        });

        test('should replace nested tags', () => {
            const template = 'Hello ${user.firstName} ${user.lastName}!';
            const values = { user: { firstName: 'John', lastName: 'Doe' } };
            const result = util.replaceTags(template, values);
            expect(result).toBe('Hello John Doe!');
        });

        test('should handle missing values by removing tags', () => {
            const template = 'Hello ${name} ${missing}!';
            const values = { name: 'John' };
            const result = util.replaceTags(template, values);
            expect(result).toBe('Hello John !');
        });

        test('should keep missing tags when keepMissingTags is true', () => {
            const template = 'Hello ${name} ${missing}!';
            const values = { name: 'John' };
            const result = util.replaceTags(template, values, { keepMissingTags: true });
            expect(result).toBe('Hello John ${missing}!');
        });

        test('should return original string for null/undefined inputs', () => {
            expect(util.replaceTags(null, { name: 'John' })).toBeNull();
            expect(util.replaceTags('Hello ${name}', null)).toBe('Hello ${name}');
            expect(util.replaceTags(undefined, { name: 'John' })).toBeUndefined();
        });

        test('should handle multiple occurrences of same tag', () => {
            const template = '${name} loves ${name}!';
            const values = { name: 'John' };
            const result = util.replaceTags(template, values);
            expect(result).toBe('John loves John!');
        });
    });

    describe('constants', () => {
        test('should have correct time constants', () => {
            expect(util.SECOND).toBe(1000);
            expect(util.MINUTE).toBe(60 * 1000);
            expect(util.HOUR).toBe(60 * 60 * 1000);
            expect(util.DAY).toBe(24 * 60 * 60 * 1000);
        });

        test('should have correct format strings', () => {
            expect(util.dateFormat).toBe('M-D-Y');
            expect(util.dateTimeFormat).toBe('M-D-Y HH:mm:ss');
        });

        test('should have MAC regex', () => {
            expect(util.macRegex).toBeInstanceOf(RegExp);
        });
    });
});