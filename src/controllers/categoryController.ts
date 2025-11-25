import { Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import { getDatabase } from '../config/database';
import { createError } from '../middleware/errorHandler';

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    console.log('getCategories called with query:', req.query);
    const { 
      page = 1, 
      limit = 50, 
      parentId, 
      isActive = true, 
      search,
      sortBy = 'sort_order',
      sortOrder = 'asc'
    } = req.query;

    let query = 'SELECT * FROM categories';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    // Parent filter
    if (parentId) {
      paramCount++;
      conditions.push(`parent_id = $${paramCount}`);
      params.push(parentId);
    } else if (parentId === null || parentId === 'null') {
      conditions.push('parent_id IS NULL');
    }

    // Active filter - always filter by active status
    paramCount++;
    conditions.push(`is_active = $${paramCount}`);
    params.push(isActive === 'false' ? false : true);

    // Search filter
    if (search) {
      paramCount++;
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const validSortFields = ['name', 'sort_order', 'created_at'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'sort_order';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(Number(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    console.log('Final query:', query);
    console.log('Query params:', params);
    const result = await db.query(query, params);
    console.log('Query result rows:', result.rows.length);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM categories';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await db.query(countQuery, params.slice(0, -2));
    console.log('Count result:', countResult.rows[0].count);

    res.json({
      categories: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.query('SELECT * FROM categories WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw createError('Category not found', 404);
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, parentId, color, icon, sortOrder } = req.body;
    const db = getDatabase();

    // Generate slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const existingCategory = await db.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (existingCategory.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await db.query(`
      INSERT INTO categories (name, slug, description, parent_id, color, icon, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, slug, description, parentId, color, icon, sortOrder || 0]);

    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, parentId, color, icon, sortOrder, isActive } = req.body;
    const db = getDatabase();

    // Check if category exists
    const existingCategory = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      throw createError('Category not found', 404);
    }

    // Generate new slug if name changed
    let slug = existingCategory.rows[0].slug;
    if (name) {
      const baseSlug = slugify(name, { lower: true, strict: true });
      slug = baseSlug;
      let counter = 1;

      while (true) {
        const existingSlug = await db.query('SELECT id FROM categories WHERE slug = $1 AND id != $2', [slug, id]);
        if (existingSlug.rows.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const result = await db.query(`
      UPDATE categories 
      SET name = COALESCE($1, name),
          slug = $2,
          description = COALESCE($3, description),
          parent_id = COALESCE($4, parent_id),
          color = COALESCE($5, color),
          icon = COALESCE($6, icon),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [name, slug, description, parentId, color, icon, sortOrder, isActive, id]);

    res.json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if category exists
    const existingCategory = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      throw createError('Category not found', 404);
    }

    // Check if category has children
    const childrenResult = await db.query('SELECT id FROM categories WHERE parent_id = $1', [id]);
    if (childrenResult.rows.length > 0) {
      throw createError('Cannot delete category with children. Move or delete children first.', 400);
    }

    await db.query('DELETE FROM categories WHERE id = $1', [id]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCategoryHierarchy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.query(`
      WITH RECURSIVE category_tree AS (
        SELECT id, name, slug, parent_id, color, icon, sort_order, 0 as depth
        FROM categories 
        WHERE id = $1
        
        UNION ALL
        
        SELECT c.id, c.name, c.slug, c.parent_id, c.color, c.icon, c.sort_order, ct.depth + 1
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT * FROM category_tree ORDER BY depth, sort_order
    `, [id]);

    res.json({ hierarchy: result.rows });
  } catch (error) {
    next(error);
  }
};

export const updateCategoryHierarchy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { parentId } = req.body;
    const db = getDatabase();

    // Check if category exists
    const existingCategory = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      throw createError('Category not found', 404);
    }

    // Prevent circular references
    if (parentId) {
      const parentResult = await db.query(`
        WITH RECURSIVE category_tree AS (
          SELECT id, parent_id
          FROM categories 
          WHERE id = $1
          
          UNION ALL
          
          SELECT c.id, c.parent_id
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT id FROM category_tree WHERE id = $2
      `, [parentId, id]);

      if (parentResult.rows.length > 0) {
        throw createError('Cannot set parent to a descendant category', 400);
      }
    }

    const result = await db.query(`
      UPDATE categories 
      SET parent_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [parentId, id]);

    res.json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
