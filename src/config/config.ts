import dotenv from 'dotenv';

dotenv.config();

// Helper function to build database URL from individual components
const buildDatabaseUrl = (): string => {
  // If DATABASE_URL is provided, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, build from individual components
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'category_service';
  
  // Build connection string
  if (dbPassword) {
    return `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  } else {
    return `postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}`;
  }
};

// Helper function to get protocol
const getProtocol = (): string => {
  if (process.env.SERVER_PROTOCOL) {
    return process.env.SERVER_PROTOCOL;
  }
  return process.env.NODE_ENV === 'production' ? 'https' : 'http';
};

// Helper function to build service URL from components
const buildServiceUrl = (serviceName: string, defaultPort: string): string => {
  const envVar = `${serviceName.toUpperCase()}_SERVICE_URL`;
  const url = process.env[envVar];
  
  if (url) {
    return url;
  }

  // Build from components
  const host = process.env[`${serviceName.toUpperCase()}_SERVICE_HOST`] || process.env.SERVICES_HOST || 'localhost';
  const port = process.env[`${serviceName.toUpperCase()}_SERVICE_PORT`] || defaultPort;
  const protocol = process.env[`${serviceName.toUpperCase()}_SERVICE_PROTOCOL`] || process.env.SERVICES_PROTOCOL || getProtocol();
  const path = process.env[`${serviceName.toUpperCase()}_SERVICE_PATH`] || '';
  
  return `${protocol}://${host}:${port}${path}`;
};

// Helper function to build frontend URL from components
const buildFrontendUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  const host = process.env.FRONTEND_HOST || 'localhost';
  const port = process.env.FRONTEND_PORT || '3000';
  const protocol = process.env.FRONTEND_PROTOCOL || getProtocol();
  const path = process.env.FRONTEND_PATH || '';
  
  return `${protocol}://${host}:${port}${path}`;
};

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || process.env.SERVER_PORT || '3004', 10),
    host: process.env.HOST || process.env.SERVER_HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
    protocol: getProtocol(),
  },

  // Frontend/CORS configuration
  cors: {
    origin: buildFrontendUrl(),
    credentials: process.env.CORS_CREDENTIALS !== 'false', // Default true
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.',
  },

  // Body parsing configuration
  bodyParser: {
    jsonLimit: process.env.BODY_JSON_LIMIT || '10mb',
    urlencoded: {
      extended: process.env.BODY_URLENCODED_EXTENDED !== 'false', // Default true
    },
  },

  // Database configuration
  database: {
    url: buildDatabaseUrl(),
    // Individual components (for cases where URL is not used)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'category_service',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000', 10),
    },
    ssl: process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false') 
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  },

  // External services
  services: {
    userServiceUrl: buildServiceUrl('user', '3001'),
    // Allow adding more services dynamically
    getServiceUrl: (serviceName: string, defaultPort: string) => buildServiceUrl(serviceName, defaultPort),
  },

  // File paths configuration
  paths: {
    schemaPath: process.env.SCHEMA_PATH || process.env.DATABASE_SCHEMA_PATH || '../../../../database/schemas/category-service.sql',
    migrationsPath: process.env.MIGRATIONS_PATH || '../../../../database/migrations',
  },

  // Application defaults
  defaults: {
    popularTagsLimit: parseInt(process.env.DEFAULT_POPULAR_TAGS_LIMIT || '20', 10),
  },
};

// Helper function to get full server URL
export const getServerUrl = (): string => {
  const protocol = config.server.protocol;
  const host = config.server.host;
  const port = config.server.port;
  const path = process.env.SERVER_PATH || '';
  
  return `${protocol}://${host}:${port}${path}`;
};

