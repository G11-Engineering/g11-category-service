import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { categoryRoutes } from './routes/categories';
import { tagRoutes } from './routes/tags';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase, getDatabase } from './config/database';
import { initializeDatabase } from './migrations/initialize';
import { config, getServerUrl } from './config/config';

const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: config.rateLimit.message
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: config.bodyParser.jsonLimit }));
app.use(express.urlencoded(config.bodyParser.urlencoded));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'category-service', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/debug', async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.query('SELECT COUNT(*) FROM categories');
      res.json({ 
        status: 'OK', 
        database_url: config.database.url ? '***configured***' : 'not configured',
        categories_count: result.rows[0].count 
      });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await connectDatabase();
    await initializeDatabase();
    
    const HOST = config.server.host;
    app.listen(PORT, HOST, () => {
      console.log(`Category Service running on ${HOST}:${PORT}`);
      console.log(`Health check: ${getServerUrl()}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
