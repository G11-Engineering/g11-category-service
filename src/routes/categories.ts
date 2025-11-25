import { Router } from 'express';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoryHierarchy,
  updateCategoryHierarchy
} from '../controllers/categoryController';
import { authenticateToken, requireEditor } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createCategorySchema, updateCategorySchema } from '../schemas/categorySchemas';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.get('/:id/hierarchy', getCategoryHierarchy);

// Development routes (no auth required)
router.post('/', validateRequest(createCategorySchema), createCategory);

// Protected routes
router.use(authenticateToken);
router.put('/:id', requireEditor, validateRequest(updateCategorySchema), updateCategory);
router.delete('/:id', requireEditor, deleteCategory);
router.put('/:id/hierarchy', requireEditor, updateCategoryHierarchy);

export { router as categoryRoutes };
