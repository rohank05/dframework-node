import ListParameters from './list-parameters.js';
import got from 'got';
import { CookieJar } from 'tough-cookie';
import util from './util.js';
import Elastic from './elastic.js';
import Sql from './sql.js';
import fs from 'fs-extra';
import path from 'path';
import adapters from './adapters/index.js';
import BusinessBaseObjectsRouter from './business/business-objects.mjs';
import MySql from './mysql.js';


/**
 * Controller class that provides CRUD operations for specific entities
 * @class Controller
 */
class Controller {
    /**
     * Creates a new Controller instance
     * @param {Object} options - Controller configuration options
     * @param {string} options.controller - The name of the controller
     * @param {Framework} options.framework - The framework instance
     */
    constructor(options) {
        Object.assign(this, options);
    }

    /**
     * Retrieves a list of records with pagination
     * @param {ListParameters} listParameters - Parameters for listing records
     * @returns {Promise<Object>} The list result with records and metadata
     * @example
     * const result = await controller.list(new ListParameters({ limit: 10, start: 0 }));
     */
    async list(listParameters) {
        const { framework, controller } = this;
        return framework.list({ controller, listParameters });
    }

    /**
     * Retrieves all records without pagination
     * @param {ListParameters} listParameters - Parameters for listing records
     * @returns {Promise<Object>} Object containing all items and total count
     * @example
     * const result = await controller.listAll(new ListParameters());
     * console.log(`Found ${result.recordCount} items:`, result.items);
     */
    async listAll(listParameters) {
        const { framework, controller } = this;
        return framework.listAll({ controller, listParameters });
    }

    /**
     * Retrieves a single record by ID or parameters
     * @param {number|string|Object} params - Record ID or parameters object
     * @returns {Promise<Object>} The retrieved record
     * @example
     * // Get by ID
     * const user = await controller.get(1);
     * 
     * // Get with parameters
     * const user = await controller.get({ id: 1, includeDetails: true });
     */
    async get(params) {
        if (typeof params === 'number' || typeof params === 'string') {
            params = { id: params };
        }
        const { framework, controller } = this;
        return framework.query({ controller, params: { action: 'load', ...params } });
    }

    /**
     * Saves a record (create or update)
     * @param {number|string|Object} id - Record ID or complete record object
     * @param {Object} [params] - Additional parameters if ID is provided separately
     * @returns {Promise<Object>} The save result
     * @example
     * // Save with ID and params
     * const result = await controller.save(1, { firstName: 'John', lastName: 'Doe' });
     * 
     * // Save with complete object
     * const result = await controller.save({ id: 1, firstName: 'John', lastName: 'Doe' });
     */
    async save(id, params) {
        if (typeof id === 'object') {
            params = id;
        } else {
            params = { id: id, ...params };
        }
        const { framework, controller } = this;
        return framework.query({ controller, params: { action: 'save', ...params } });
    }
}

/**
 * Main Framework class for interacting with DFramework portal APIs and data sources
 * @class Framework
 */
class Framework {

    /**
     * Creates a new Framework instance
     * @param {Object} options - Framework configuration options
     * @param {Object} [options.clientOptions={}] - HTTP client configuration options
     * @param {Console} [options.logger=console] - Logger instance for debugging
     * @param {string} [options.serverUrl='https://portal.coolrgroup.com'] - Base URL for portal APIs
     * @param {string} [options.loginController='Login'] - Controller name for authentication
     * @example
     * const framework = new Framework({
     *   logger: customLogger,
     *   serverUrl: 'https://myportal.example.com'
     * });
     */
    constructor(options) {
        const { clientOptions = {}, ...otherOptions } = options;
        Object.assign(this, otherOptions);
        const cookieJar = new CookieJar();

        this.client = got.extend({ cookieJar, ...clientOptions });
    }

    /**
     * Configures Elasticsearch connection
     * @param {Object} elasticConfig - Elasticsearch configuration
     * @param {string} [elasticConfig.environment] - Environment name to load from environments folder
     * @param {string} [elasticConfig.host] - Direct host URL if environment is not used
     * @returns {Promise<Framework>} This instance for chaining
     * @example
     * await framework.setElastic({ environment: 'production' });
     */
    async setElastic(elasticConfig) {
        let elastic;
        if (elasticConfig) {
            let baseUrl
            if (elasticConfig.environment) {
                baseUrl = fs.readJsonSync(path.resolve('environments', elasticConfig.environment + '.esenv')).host;
            } else {
                baseUrl = null;
            }

            const requestAdapter = new adapters.request.Got(this.client);

            elastic = new Elastic({ baseUrl, requestAdapter });
        }
        this.elastic = elastic;
        return this;
    }

    /**
     * Configures SQL Server connection
     * @param {Object} sqlConfig - SQL Server configuration
     * @param {string} sqlConfig.server - Database server hostname
     * @param {string} sqlConfig.database - Database name
     * @param {string} sqlConfig.user - Username for authentication
     * @param {string} sqlConfig.password - Password for authentication
     * @param {Object} [sqlConfig.options] - Additional connection options
     * @returns {Promise<Framework>} This instance for chaining
     * @example
     * await framework.setSql({
     *   server: 'localhost',
     *   database: 'mydb',
     *   user: 'sa',
     *   password: 'password',
     *   options: { trustServerCertificate: true }
     * });
     */
    async setSql(sqlConfig) {
        let sql;
        if (sqlConfig) {
            sql = new Sql();
            await sql.setConfig(sqlConfig);
        }
        this.sql = sql;
        return this;
    }

    /**
     * Configures MySQL connection
     * @param {Object} mysqlConfig - MySQL configuration
     * @param {string} mysqlConfig.host - Database host
     * @param {number} mysqlConfig.port - Database port
     * @param {string} mysqlConfig.user - Username for authentication
     * @param {string} mysqlConfig.password - Password for authentication
     * @param {string} mysqlConfig.database - Database name
     * @returns {Promise<Framework>} This instance for chaining
     * @example
     * await framework.setMySql({
     *   host: 'localhost',
     *   port: 3306,
     *   user: 'root',
     *   password: 'password',
     *   database: 'mydb'
     * });
     */
    async setMySql(mysqlConfig) {
        let mysql;
        if(mysqlConfig) {
            mysql = new MySql();
            mysql.setConfig({ namedPlaceholders: true, ...mysqlConfig });
        }
        this.mysql = mysql;
        return this;
    }

    /** @type {Object|undefined} Stores login information after successful authentication */
    loginInfo = undefined

    /** @type {string} Controller name used for authentication */
    loginController = 'Login'

    /** @type {string} Default server URL for portal APIs */
    serverUrl = 'https://portal.coolrgroup.com'

    /** @type {Console} Logger instance for debugging */
    logger = console

    /** @type {Object} Container for dynamically created controllers */
    controllers = {}

    /**
     * Authenticates with the portal using provided credentials
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.username - Username for authentication
     * @param {string} credentials.password - Password for authentication
     * @returns {Promise<boolean>} True if login was successful, false otherwise
     * @example
     * const success = await framework.login({
     *   username: process.env.APP_USER,
     *   password: process.env.APP_PASSWORD
     * });
     * if (!success) {
     *   console.error('Login failed');
     * }
     */
    async login(credentials) {
        const { loginController } = this;
        const loginInfo = await this.query({ controller: loginController, params: credentials });
        this.loginInfo = loginInfo;
        return loginInfo !== null && loginInfo.success === true;
    }

    /**
     * Creates and returns a controller instance for the specified entity
     * @param {string} controller - The controller name
     * @returns {Controller} A new controller instance
     * @example
     * const userController = framework.getController('User');
     */
    getController(controller) {
        return new Controller({ controller, framework: this });
    }

    /**
     * Creates multiple controllers and stores them in the controllers object
     * @param {...string} names - Controller names to create
     * @example
     * framework.createControllers('User', 'Item', 'Order');
     * // Access via framework.controllers.User, framework.controllers.Item, etc.
     */
    createControllers() {
        for (const name of arguments) {
            this.controllers[name] = this.getController(name);
        }
    }

    /**
     * Executes a query against a portal controller
     * @param {Object} options - Query options
     * @param {string} options.controller - Controller name to query
     * @param {Object} [options.params] - Parameters to send with the request
     * @param {string} [options.method='POST'] - HTTP method to use
     * @param {...Object} options.additionalOptions - Additional options passed to HTTP client
     * @returns {Promise<Object|string|null>} The response data, or null if request failed
     * @example
     * const result = await framework.query({
     *   controller: 'User',
     *   params: { action: 'load', id: 1 }
     * });
     */
    async query({ controller, params, method = "POST", ...options }) {
        const { serverUrl, client } = this;
        const url = `${serverUrl}/Controllers/${controller}.ashx`;

        if (params) {
            if (typeof params?.toFormData === 'function') {
                options.form = params.toFormData();
            } else {
                options.form = params;
            }
        }
        const result = await client({ url, method, ...options });
        if (result.statusCode === 200) {
            if (result.headers["content-type"].match(/^application\/json/i) ||
                result.body.startsWith('{') || result.body.startsWith('[')) {
                return JSON.parse(result.body);
            }
            return result.body;
        }
        return null;
    }

    /**
     * Retrieves a paginated list of records from a controller
     * @param {Object} options - List options
     * @param {string} options.controller - Controller name
     * @param {ListParameters} options.listParameters - List parameters including pagination
     * @returns {Promise<Object>} List result with records and metadata
     * @throws {Error} When data couldn't be fetched or response is invalid
     * @example
     * const result = await framework.list({
     *   controller: 'User',
     *   listParameters: new ListParameters({ limit: 10, start: 0 })
     * });
     */
    async list({ controller, listParameters }) {
        const { logger } = this;
        logger.debug(`Fetching ${listParameters.limit} from ${listParameters.start}`);
        const data = await this.query({ controller, params: listParameters });
        if (data === null || typeof data.recordCount !== 'number') {
            throw new Error("Couldn't fetch data");
        }
        return data;
    }

    /**
     * Retrieves all records from a controller without pagination limits
     * @param {Object} options - List options
     * @param {string} options.controller - Controller name
     * @param {ListParameters} options.listParameters - List parameters
     * @returns {Promise<Object>} Object with items array and total recordCount
     * @throws {Error} When data couldn't be fetched or response is invalid
     * @example
     * const result = await framework.listAll({
     *   controller: 'User',
     *   listParameters: new ListParameters()
     * });
     * console.log(`Retrieved ${result.items.length} of ${result.recordCount} records`);
     */
    async listAll({ controller, listParameters }) {
        let recordCount;
        const { logger } = this;
        const items = [];
        while (true) {
            logger.debug(`Fetching ${listParameters.limit} from ${listParameters.start} of ${recordCount}`);
            const data = await this.query({ controller, params: listParameters });
            if (data === null || typeof data.recordCount !== 'number') {
                throw new Error("Couldn't fetch data");
            }

            recordCount = data.recordCount;

            const records = data.records;

            items.push(...records);

            if (items.length === recordCount || records.length < listParameters.limit) {
                break;
            }

            listParameters.start += listParameters.limit;
        }
        return { items, recordCount };
    }

    /**
     * Sets up business object routing configuration
     * @param {Object} options - Configuration options
     * @param {Object} options.router - Express router instance
     * @param {Object} options.businessObjectConfigs - Business object configurations
     * @returns {Object} The configured router
     * @example
     * const router = framework.setBusinessBase({
     *   router: express.Router(),
     *   businessObjectConfigs: { User: { tableName: 'Users' } }
     * });
     */
    setBusinessBase({ router, businessObjectConfigs }) {
         new BusinessBaseObjectsRouter(router, businessObjectConfigs);
        return router;
    }
    
    /** @type {typeof ListParameters} Reference to ListParameters class */
    ListParameters = ListParameters

    /** @type {Object} Utility functions */
    util = util

    /** @type {Object} Static utility functions */
    static util = util
}

export default Framework;
