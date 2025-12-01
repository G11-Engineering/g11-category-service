import { getDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Read and execute the schema
    const schemaPath = path.join(__dirname, '../../database/schemas/category-service.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    try {
      await db.query(schema);
      console.log('Category service database schema initialized');
    } catch (error: any) {
      // If schema already exists, that's fine
      if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists')) {
        console.log('Category service database schema already initialized');
      } else {
        throw error;
      }
    }
    
    // Create default categories
    await createDefaultCategories();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const createDefaultCategories = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Check if categories exist
    const result = await db.query('SELECT COUNT(*) FROM categories');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      const defaultCategories = [
        { name: 'Technology', description: 'Posts about technology and programming', color: '#3B82F6' },
        { name: 'Lifestyle', description: 'Posts about lifestyle and personal experiences', color: '#10B981' },
        { name: 'Business', description: 'Posts about business and entrepreneurship', color: '#F59E0B' },
        { name: 'Health', description: 'Posts about health and wellness', color: '#EF4444' },
        { name: 'Travel', description: 'Posts about travel and adventures', color: '#8B5CF6' }
      ];
      
      for (const category of defaultCategories) {
        const slug = category.name.toLowerCase().replace(/\s+/g, '-');
        await db.query(`
          INSERT INTO categories (name, slug, description, color, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [category.name, slug, category.description, category.color, true]);
      }
      
      console.log('Default categories created');
    }
  } catch (error) {
    console.error('Failed to create default categories:', error);
  }
};
