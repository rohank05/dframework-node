import { promisify } from 'util';
import got from 'got'
import stream from 'stream';
import fs from 'fs';
import prompt from 'prompt';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import config from './appConfig.js';

/**
 * Utility functions for data manipulation, formatting, and HTTP requests
 * @namespace util
 */

const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/

const pipeline = promisify(stream.pipeline);

const defaultTemplate = /\${((\w+)\.)?(\w+)}/gm;

export default {
    /** @type {RegExp} Regular expression for validating MAC addresses */
    macRegex,

    /** @type {string} Default date format string */
    dateFormat: 'M-D-Y',

    /** @type {string} Default date-time format string */
    dateTimeFormat: 'M-D-Y HH:mm:ss',

    /** @type {number} Milliseconds in a second */
    SECOND: 1000,

    /** @type {number} Milliseconds in a minute */
    MINUTE: 60 * 1000,

    /** @type {number} Milliseconds in an hour */
    HOUR: 60 * 60 * 1000,

    /** @type {number} Milliseconds in a day */
    DAY: 24 * 60 * 60 * 1000,

    /** @type {Object} Data mode constants */
    dataModes: {
        asFile: 'file'
    },

    /**
     * Formats a date according to the specified format string
     * @param {Date|string} date - Date to format (can be Date object or string)
     * @param {string} [dateFormat] - Format string (defaults to util.dateFormat)
     * @returns {Date|string} Formatted date string or original value if invalid
     * @example
     * util.formatDate(new Date(2023, 0, 15), 'Y-M-D'); // '2023-01-15'
     * util.formatDate(new Date(2023, 0, 15), 'M/D/y'); // '01/15/23'
     */
    formatDate: function (date, dateFormat) {
        dateFormat = dateFormat || this.dateFormat;
        if (!date) return date;
        if (typeof date === 'string' && date.length === 17) {
            date = this.parseDate(date);
        }
        if (!date.getFullYear) { return date; }
        return dateFormat.replace('Y', date.getFullYear())
            .replace('y', date.getFullYear().toString().substr(2))
            .replace('M', (date.getMonth() + 1).toString().padStart(2, '0'))
            .replace('D', date.getDate().toString().padStart(2, '0'))
            .replace('HH', date.getHours().toString().padStart(2, '0'))
            .replace('mm', date.getMinutes().toString().padStart(2, '0'))
            .replace('ss', date.getSeconds().toString().padStart(2, '0'))
    },

    /**
     * Formats a date-time according to the specified format string
     * @param {Date|string} date - Date to format
     * @param {string} [dateFormat] - Format string (defaults to util.dateTimeFormat)
     * @returns {string} Formatted date-time string
     * @example
     * util.formatDateTime(new Date(2023, 0, 15, 14, 30, 0), 'M-D-Y HH:mm:ss'); // '01-15-2023 14:30:00'
     */
    formatDateTime: function (date, dateFormat) {
        return this.formatDate(date, dateFormat || this.dateTimeFormat);
    },

    /**
     * Checks if a string is a valid MAC address format
     * @param {string} value - Value to test
     * @returns {boolean} True if value is a valid MAC address format
     * @example
     * util.isMacAddress('00:1B:44:11:3A:B7'); // true
     * util.isMacAddress('invalid'); // false
     */
    isMacAddress: function (value) {
        return typeof value === 'string' && macRegex.test(value);
    },

    /**
     * Parses a date string in the format YYYYMMDDHHMMSSMMM
     * @param {string} value - Date string to parse
     * @returns {Date|string} Parsed Date object or original value if too short
     * @example
     * util.parseDate('20231015143000000'); // Date object for Oct 15, 2023 14:30:00
     */
    parseDate: function (value) {
        //20171025121944933
        if (value && value.length > 10) {
            return new Date(value.substr(0, 4), value.substr(4, 2) - 1, value.substr(6, 2), value.substr(8, 2), value.substr(10, 2), value.substr(12, 2), value.substr(14, 3));
        }
        return value;
    },

    /**
     * Extracts unique values for a specific key from a collection
     * @param {Array<Object>} collection - Array of objects
     * @param {string} key - Property key to extract unique values for
     * @returns {Array} Array of unique values
     * @example
     * const users = [{ name: 'John' }, { name: 'Jane' }, { name: 'John' }];
     * util.unique(users, 'name'); // ['John', 'Jane']
     */
    unique: function (collection, key) {
        return [...new Set(collection.map(item => item[key]))];
    },

    /**
     * Performs a left join on two arrays of objects
     * @param {Object} options - Join configuration
     * @param {Array} options.left - Left array (main data)
     * @param {Array} options.right - Right array (lookup data)
     * @param {Array<string>} options.join - Array with [leftKey, rightKey] for joining
     * @param {Array<string>} options.columns - Columns to copy from right to left
     * @example
     * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
     * const roles = [{ userId: 1, role: 'admin' }, { userId: 2, role: 'user' }];
     * util.join({ left: users, right: roles, join: ['id', 'userId'], columns: ['role'] });
     * // users array now includes role property
     */
    join: function ({ left, right, join, columns }) {
        const lookup = {};
        let key = join[1];
        for (const entry of right) {
            if (entry.hasOwnProperty(key)) {
                const keyValue = entry[key];
                if (keyValue !== undefined && keyValue !== null) {
                    lookup[keyValue] = entry;
                }
            }
        }
        key = join[0];
        for (const row of left) {
            let lookupEntry = {};
            if (row.hasOwnProperty(key)) {
                const keyValue = row[key];
                lookupEntry = lookup[keyValue] || {};
            }
            for (const column of columns) {
                row[column] = lookupEntry[column];
            }
        }
    },

    /**
     * Return a default value if date is not a valid date
     * @param date Date value to be evaluated
     * @param defaultDate Date optional - value to be assigned if date is invalid/ empty. Defaultst to 1/1/2000
     * @returns date a valid date
     */
    safeDate: function (date, defaultDate = new Date(2000, 0, 1)) {
        if (date === null || typeof date.getMonth !== 'function') {
            return defaultDate;
        }
        return date;
    },

    /**
     * Returns the minimum value in the array
     * @param arr Array elements
     * @param min Any default minimum value
     * @returns Minimum value in the array
     */
    min: function (arr, min = Infinity) {
        var len = arr.length;
        while (len--) {
            if (arr[len] < min) {
                min = arr[len];
            }
        }
        return min;
    },

    /**
     * Returns the maximum value in the array
     * @param arr Array elements
     * @param min Any default maximum value
     * @returns Maximum value in the array
     */
    max: function (arr, max = -Infinity) {
        var len = arr.length
        while (len--) {
            if (arr[len] > max) {
                max = arr[len];
            }
        }
        return max;
    },

    /**
     * Downloads a file from a url
     * @param {String} url
     * @param {Object} options
     * @param {any} options.dest - string/ function({ filename, response }) - destination file path or function to return a destination file path
     * @returns 
     */
    download: function (url, { dest } = {}) {
        return new Promise((resolve, reject) => {
            got.stream(url)
                .on('response', async response => {
                    if (response.statusCode !== 200) {
                        return reject(new Error('Invalid status'), response);
                    }
                    let filename = response.headers['content-disposition'].split('filename=')[1];
                    if (filename) {
                        filename = filename.replace(/\"/g, '');
                    }
                    if (typeof dest === 'function') {
                        filename = dest({ filename, response });
                    } else if (typeof dest === 'string') {
                        filename = dest;
                    }
                    if (!filename) {
                        return reject(new Error('No filename'), response);
                    }
                    const outFile = fs.createWriteStream(filename);
                    await pipeline(
                        response,
                        outFile
                    );
                    resolve();
                })
                .resume();
        });
    },

    prompt,

    confirm: async function (options) {
        if (typeof options === 'string') {
            options = {
                description: options
            };
        }
        options = {
            description: 'Are you sure?',
            pattern: /^[yn]$/,
            required: true,
            message: 'Please enter y or n',
            ...options
        };
        const { confirm } = await prompt.get({
            properties: {
                confirm: options
            }
        });
        return confirm === 'y';
    },

    /**
     * @description Replaces the given tags in the given source with the given values.
     * @param {string} source The source to replace the tags in.
     * @param {object} values The values to replace the tags with.
     * @param {object} options template - Regex to use for matching tags, keepMissingTags - Whether to keep tags that are not replaced.
     * @returns {string} The source with the tags replaced.
     * @example
     * // Replaces all tags in the given source with the given values.
     * console.log(template("${firstName} ${lastName}", { firstName: "John", lastName: "Doe" }));
     * // -> "John Doe"
     * // Two level tags are supported.
     * console.log(template("${user.firstName} ${user.lastName}", { user: { firstName: "John", lastName: "Doe" } }));
     * // -> "John Doe"
     **/
    replaceTags: function (source, tags, { template = defaultTemplate, keepMissingTags = false } = {}) {
        if (!source || !tags) {
            return source;
        }

        return source.replace(template, function (match, g1, g2, g3) {
            const container = g2 ? tags[g2] || {} : tags;
            if (container[g3] === undefined) {
                return keepMissingTags ? match : "";
            }
            return container[g3];
        });
    },

    request: async function ({
        authentication,
        reauthenticateCodes = [401, 403],
        body,
        form,
        ...options
    }) {
        // custom header options
        options.headers = options.headers || {};
        const headers = options.headers;
        options.method = options.method || 'POST';
        options.https = config.httpsOptions;

        // if authentication is specified and it may need renewal, we might need to try the request twice
        let authorizationHeader;
        const makeRequest = async (firstTry = true) => {
            if (authentication) {
                authorizationHeader = await authentication.getAuthorizationHeader({ renew: !firstTry });
                if (authorizationHeader) {
                    headers.Authorization = authorizationHeader;
                } else if (!firstTry) {
                    throw new Error('Authorization renewal failed');
                }
            }
            const bodyData = typeof body === 'function' ? await body() : body;
            const formData = typeof form === 'function' ? await form() : form;
            return got({ body: bodyData, form: formData, ...options });
        };

        try {
            return await makeRequest();
        } catch (error) {
            if (authorizationHeader && reauthenticateCodes.includes(error.response?.statusCode) && authentication.mayRequireRenewal) {
                return makeRequest(false);
            } else {
                throw error;
            }
        }
    },

    /**
     * Adds object as file to FormData - you can specify a key and value/ buffer/ stream/ blob with optional filename and contentType
     * @param {Object} options.formData     FormData object
     * @param {String} options.key          Form object key
     * @param {Object} options.value        Form object value (if an object or string needs to be sent as a file)
     * @param {Object} options.buffer       Buffer object to be sent as a file (optional)
     * @param {Object} options.stream       Readable stream to be sent as a file (optional)
     * @param {Object} options.blob         Blob object to be sent as a file (optional)
     * @param {String} options.filename     File name (optional)
     * @param {String} options.contentType  File content type (optional)
     * @returns 
     */

    appendFileToForm: function ({ formData, key, value, buffer, stream, blob, fileName, contentType = 'application/octet-stream' }) {
        if (fileName) {
            blob = fs.createReadStream(fileName);
        } else if (buffer) {
            blob = buffer;
        } else if (value) {
            blob = typeof (value) === 'string' ? Buffer.from(value) : Buffer.from(JSON.stringify(value));
            contentType = 'application/json';
        } else if (stream) {
            blob = stream;
        }
        formData.append(this.dataModes.asFile, blob, { fileName, contentType });
        return formData;
    },

    toFormData: function (options) {
        if (arguments.length === 1) {
            options = { data: options };
        }
        const {
            data,
            formData = new FormData(),
            parentKey
        } = options;
        for (const key in data) {
            let value = data[key];
            if (value === undefined) {
                continue;
            }
            if (value === null) {
                value = '';
            }
            if (typeof value === 'object'
                && !(value instanceof Date)
                && !(value instanceof Buffer)
                && !(value instanceof stream.Stream)) {
                this.toFormData({
                    data: value,
                    formData,
                    parentKey: key
                });
            } else {
                formData.append(parentKey ? `${parentKey}[${key}]` : key, value);
            }
        }
        return formData;
    },
    baseDateFormat: {
        MMMMYYYY: "MMMM YYYY",
        YYYYMMDD: "YYYY-MM-DD"
    },
    RelationTypes: {
        Elastic: 'elastic',
        SQL: 'sql'
    },
    elasticBaseQuery: { "size": 10, "from": 0, "sort": [], "track_total_hits": true, "query": { "bool": { "filter": { "bool": { "must": [], "must_not": [], "should": [] } } } }, "_source": { "includes": [] } },
    getFrequencyType: (val) => {
        switch (val) {
            case "V": return "At every visit";
            case "O": return "Every outlet only once";
            case "W": return "Once per week";
            case "M": return "Once per month";
            case "Q": return "Once per quarter";
            case "Y": return "Once per Year";
            default: return "";
        }
    },
    getPriority: (val) => {
        switch (val) {
            case 1: return "High";
            case 2: return "Medium";
            case 3: return "Low";
            default: return "";
        }
    },
    getSelectedDays: (value) => {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = [];
        for (let i = 0, iLen = value.length; i < iLen; i++) {
            if (value[i] === '1') {
                selectedDays.push(daysOfWeek[i]);
            }
        }
        return selectedDays.join(', ');
    },
    dateTimeFields: ['date', 'datetime', 'dateTime', 'dateTimeLocal'],
    dateTimeExportFormat: ' hh:mm:ss A',
    excelColumnWidthEnum: 6,
    dateTimeCSVExportFormat: '-hh:mm:ss A',
    reportDatesFormat: {
        dateTime: "MM/DD/YYYY HH:mm:ss A",
        date: "MM/DD/YYYY",
        dateFileName: "MM-DD-YYYY",
        ukRAGReportDate: "MM/DD/YYYY",
        yyyymmdd: 'YYYY-MM-DD'
    },
    reportTypes: {
        excel: "xlsx",
        csv: "csv",
        json: "json",
        text: "txt"
    },
    dateTimeExcelExportFormat: ' hh:mm:ss AM/PM',
    dateTimeExcelRowExportFormat: ' hh:mm:ss A',
    fileNameRegex: /[^A-Za-z0-9-_]/g,
    elasticQueryMaxSize: 10000,
    useSqlParameterLength: config?.useSqlParameterLength || false,
    sqlParameterLength: config?.sqlParameterLength || {
        varchar: 8000,
        nvarchar: 4000,
        decimal_precision: 38,
        decimal_scale: 17
    }
};