# DFramework Node.js Library

A comprehensive Node.js library for interacting with DFramework portal APIs, databases, and various data sources. This library provides utilities for authentication, database operations, Elasticsearch integration, logging, and more.

## Features

- 🔐 **Authentication**: Support for Basic and Bearer token authentication
- 🗄️ **Database Support**: Integration with SQL Server and MySQL
- 🔍 **Elasticsearch**: Full Elasticsearch query and aggregation support
- 📊 **Portal APIs**: Seamless integration with DFramework portal controllers
- 📝 **Logging**: Structured logging with Pino
- 🛠️ **Utilities**: Comprehensive utility functions for data manipulation
- ☁️ **Azure Integration**: Azure Blob Storage and identity management

## Installation

```bash
npm install @durlabh/dframework
```

## Quick Start

```javascript
import Framework from '@durlabh/dframework';

// Initialize the framework
const framework = new Framework({
    logger: console, // or your custom logger
    serverUrl: 'https://your-portal.example.com' // optional, defaults to portal.coolrgroup.com
});

// Login to the portal
const loginSuccess = await framework.login({
    username: process.env.APP_USER,
    password: process.env.APP_PASSWORD
});

if (!loginSuccess) {
    console.error('Login failed');
    process.exit(1);
}

// Create controllers for your entities
framework.createControllers('User', 'Item', 'Order');

// Use the controllers
const users = await framework.controllers.User.list(
    new framework.ListParameters({ limit: 10, start: 0 })
);
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Portal Authentication
APP_USER=your_username
APP_PASSWORD=your_password

# Database Configuration (optional)
SQL_SERVER=localhost
SQL_DATABASE=your_database
SQL_USER=your_db_user
SQL_PASSWORD=your_db_password

# Elasticsearch (optional)
ELASTIC_ENVIRONMENT=production
```

### Configuration File

Create `config.json` and optionally `config.local.json` for environment-specific overrides:

```json
{
  "logging": {
    "prettyPrint": {
      "translateTime": "SYS:yyyy-mm-dd h:MM:ss",
      "colorize": true,
      "singleLine": false,
      "levelFirst": false
    },
    "file": {
      "frequency": "daily",
      "max_logs": "10d",
      "date_format": "YYYY-MM-DD",
      "size": "1m",
      "extension": ".log"
    },
    "otherConfig": {
      "stdout": true,
      "logLevel": "debug",
      "logFolder": "./logs"
    }
  }
}
```

## Usage Examples

### Portal API Operations

#### Authentication and Controller Setup

```javascript
import Framework from '@durlabh/dframework';

const framework = new Framework();

// Login
const loggedIn = await framework.login({
    username: process.env.APP_USER,
    password: process.env.APP_PASSWORD
});

// Create controllers
framework.createControllers('User', 'Item', 'Order');
```

#### Getting Records

```javascript
// Get a single record by ID
const user = await framework.controllers.User.get(1);

// Get with additional parameters
const userWithDetails = await framework.controllers.User.get({
    id: 1,
    includeRoles: true
});
```

#### Listing Records

```javascript
// Get paginated list
const userList = await framework.controllers.User.list(
    new framework.ListParameters({
        limit: 20,
        start: 0,
        comboTypes: ['Role'] // include related data
    })
);

// Get all records (handles pagination automatically)
const allUsers = await framework.controllers.User.listAll(
    new framework.ListParameters()
);
console.log(`Found ${allUsers.recordCount} users`);
```

#### Saving Records

```javascript
// Create new record
const newUser = await framework.controllers.User.save({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
});

// Update existing record
const updatedUser = await framework.controllers.User.save({
    id: 1,
    firstName: 'John',
    lastName: 'Smith'
});
```

### Database Operations

#### SQL Server Setup

```javascript
await framework.setSql({
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
        trustServerCertificate: true
    }
});
```

#### Running Queries

```javascript
// Query from file
const activeUsers = await framework.sql.query('queries/activeUsers.sql');

// Raw query with parameters
const { mssql } = await import('@durlabh/dframework');
const request = framework.sql.createRequest();
request.input('IsActive', mssql.VarChar, 'Y');
const users = await framework.sql.query(`
    SELECT * FROM dbo.Users WHERE IsActive = @IsActive
`);
```

#### MySQL Setup

```javascript
await framework.setMySql({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'mydb'
});

// Use similar to SQL Server
const result = await framework.mysql.query('SELECT * FROM users');
```

### Elasticsearch Integration

#### Setup

1. Create environment file `environments/production.esenv`:
```json
{
    "host": "https://your-elasticsearch-cluster.com:9200",
    "name": "Production"
}
```

2. Initialize in code:
```javascript
await framework.setElastic({
    environment: 'production'
});
```

#### Querying

```javascript
const results = await framework.elastic.aggregate({
    query: 'mySearchQuery',
    customize: (query) => {
        // Customize the Elasticsearch query
        query.query.bool.filter.bool.must.push({
            term: { status: 'active' }
        });
        return query;
    },
    mappings: {
        "Items": {
            root: "items",
            map: {
                "Transactions": "doc_count"
            }
        }
    }
});
```

### Authentication for External APIs

#### Basic Authentication

```javascript
import { httpAuth } from '@durlabh/dframework';

const basicAuth = new httpAuth.BasicAuth({
    username: 'api_user',
    password: 'api_password'
});

const response = await util.request({
    url: 'https://api.example.com/data',
    authentication: basicAuth,
    method: 'GET'
});
```

#### Bearer Token Authentication

```javascript
const bearerAuth = new httpAuth.BearerAuth({
    url: 'https://api.example.com/oauth/token',
    tokenKey: 'access_token',
    requestOptions: {
        form: {
            grant_type: 'client_credentials',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
        }
    }
});

const response = await util.request({
    url: 'https://api.example.com/protected-data',
    authentication: bearerAuth,
    method: 'GET'
});
```

### Logging

```javascript
import { logger } from '@durlabh/dframework';

logger.info('Application started');
logger.debug('Debug information', { userId: 123 });
logger.error('Something went wrong', error);
logger.warn('Warning message');
```

### Utility Functions

```javascript
import { util } from '@durlabh/dframework';

// Date formatting
const formatted = util.formatDate(new Date(), 'Y-M-D'); // '2023-12-25'
const dateTime = util.formatDateTime(new Date(), 'M/D/Y HH:mm:ss');

// Array utilities
const users = [{ name: 'John' }, { name: 'Jane' }, { name: 'John' }];
const uniqueNames = util.unique(users, 'name'); // ['John', 'Jane']

// Data joining
util.join({
    left: users,
    right: roles,
    join: ['id', 'userId'],
    columns: ['roleName']
});

// Template replacement
const message = util.replaceTags(
    'Hello ${user.firstName} ${user.lastName}!',
    { user: { firstName: 'John', lastName: 'Doe' } }
); // 'Hello John Doe!'
```

## API Reference

### Framework Class

- `constructor(options)` - Initialize framework
- `login(credentials)` - Authenticate with portal
- `createControllers(...names)` - Create controller instances
- `setSql(config)` - Configure SQL Server connection
- `setMySql(config)` - Configure MySQL connection
- `setElastic(config)` - Configure Elasticsearch connection

### Controller Class

- `get(id)` - Retrieve single record
- `list(listParameters)` - Get paginated list
- `listAll(listParameters)` - Get all records
- `save(data)` - Create or update record

### Authentication Classes

- `BasicAuth(options)` - Basic authentication
- `BearerAuth(options)` - Bearer token authentication

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation and examples above
- Review the JSDoc comments in the source code
