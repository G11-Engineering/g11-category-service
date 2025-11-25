import { Router } from 'express';
import { 
  getTags, 
  getTagById, 
  createTag, 
  updateTag, 
  deleteTag,
  getPopularTags
} from '../controllers/tagController';
import { authenticateToken, requireEditor } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createTagSchema, updateTagSchema } from '../schemas/tagSchemas';

const router = Router();

// Public routes
router.get('/', getTags);
router.get('/popular', getPopularTags);
router.get('/:id', getTagById);

// Development routes (no auth required)
router.post('/', validateRequest(createTagSchema), createTag);

// Protected routes
router.use(authenticateToken);
router.put('/:id', requireEditor, validateRequest(updateTagSchema), updateTag);
router.delete('/:id', requireEditor, deleteTag);

export { router as tagRoutes };
