import { Pool, PoolConfig } from 'pg';
import { config } from './config';

let pool: Pool;

export const connectDatabase = async (): Promise<void> => {
  try {
    const poolConfig: PoolConfig = {
      max: config.database.pool.max,
      idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
    };

    // Use DATABASE_URL if available, otherwise use individual components
    if (config.database.url && config.database.url.trim() !== '') {
      poolConfig.connectionString = config.database.url;
    } else {
      // Build connection from individual components
      poolConfig.host = config.database.host;
      poolConfig.port = config.database.port;
      poolConfig.user = config.database.user;
      poolConfig.password = config.database.password;
      poolConfig.database = config.database.name;
    }

    // SSL configuration
    if (config.database.ssl) {
      poolConfig.ssl = config.database.ssl;
    }

    pool = new Pool(poolConfig);

    // Test the connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const getDatabase = (): Pool => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
};
