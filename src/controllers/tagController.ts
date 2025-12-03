import { Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import { getDatabase } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { config } from '../config/config';

export const getTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    const { 
      page = 1, 
      limit = 50, 
      isActive = true, 
      search,
      sortBy = 'usage_count',
      sortOrder = 'desc'
    } = req.query;

    let query = 'SELECT * FROM tags';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

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
    const validSortFields = ['name', 'usage_count', 'created_at'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'usage_count';
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

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tags';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await db.query(countQuery, params.slice(0, -2));

    res.json({
      tags: result.rows,
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

export const getTagById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.query('SELECT * FROM tags WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw createError('Tag not found', 404);
    }

    res.json({ tag: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, color } = req.body;
    const db = getDatabase();

    // Generate slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const existingTag = await db.query('SELECT id FROM tags WHERE slug = $1', [slug]);
      if (existingTag.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await db.query(`
      INSERT INTO tags (name, slug, description, color)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, slug, description, color]);

    res.status(201).json({ tag: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, color, isActive } = req.body;
    const db = getDatabase();

    // Check if tag exists
    const existingTag = await db.query('SELECT id FROM tags WHERE id = $1', [id]);
    if (existingTag.rows.length === 0) {
      throw createError('Tag not found', 404);
    }

    // Generate new slug if name changed
    let slug = existingTag.rows[0].slug;
    if (name) {
      const baseSlug = slugify(name, { lower: true, strict: true });
      slug = baseSlug;
      let counter = 1;

      while (true) {
        const existingSlug = await db.query('SELECT id FROM tags WHERE slug = $1 AND id != $2', [slug, id]);
        if (existingSlug.rows.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const result = await db.query(`
      UPDATE tags 
      SET name = COALESCE($1, name),
          slug = $2,
          description = COALESCE($3, description),
          color = COALESCE($4, color),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, slug, description, color, isActive, id]);

    res.json({ tag: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if tag exists
    const existingTag = await db.query('SELECT id FROM tags WHERE id = $1', [id]);
    if (existingTag.rows.length === 0) {
      throw createError('Tag not found', 404);
    }

    await db.query('DELETE FROM tags WHERE id = $1', [id]);

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPopularTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = config.defaults.popularTagsLimit } = req.query;
    const db = getDatabase();

    const result = await db.query(`
      SELECT * FROM tags 
      WHERE is_active = true 
      ORDER BY usage_count DESC, name ASC 
      LIMIT $1
    `, [Number(limit)]);

    res.json({ tags: result.rows });
  } catch (error) {
    next(error);
  }
};
