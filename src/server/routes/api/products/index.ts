import { Router } from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listProductsController,
    getProductController,
    createProductController,
    updateProductController,
    activateProductController,
    deleteProductController,
    importProductsController,
    downloadTemplateController,
} from './products.controller';
import { uploadImagesController, deleteImageController } from './images.controller';
import { uploadProductImages } from '../../../services/upload';

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

const validateProduct = [
    body('name').notEmpty().withMessage('Name is required.'),
    body('category').notEmpty().withMessage('Category is required.'),
    body('brand').optional().isString(),
    body('description').optional().isString(),
    checkForValidationErrors,
];

router.get('/import/template',
    isLoggedIn,
    hasPermission('can_create_products'),
    downloadTemplateController,
);

router.post('/import',
    isLoggedIn,
    hasPermission('can_create_products'),
    csvUpload.single('file'),
    importProductsController,
);

router.get('/',
    isLoggedIn,
    hasPermission('can_view_products'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.').toInt(),
    query('search').optional().isString().trim(),
    query('category').optional().isString().trim(),
    checkForValidationErrors,
    listProductsController,
);

router.get('/:id',   isLoggedIn, hasPermission('can_view_products'),   getProductController);
router.post('/',     isLoggedIn, hasPermission('can_create_products'),  uploadProductImages.array('images', 8), validateProduct, createProductController);
router.put('/:id',   isLoggedIn, hasPermission('can_update_products'),  validateProduct, updateProductController);
router.patch('/:id/activate',
    isLoggedIn,
    hasPermission('can_update_products'),
    param('id').isUUID().withMessage('Invalid product id.'),
    checkForValidationErrors,
    activateProductController,
);
router.delete('/:id', isLoggedIn, hasPermission('can_delete_products'), deleteProductController);

router.post('/:id/images',
    isLoggedIn,
    hasPermission('can_update_products'),
    uploadProductImages.array('images', 8),
    uploadImagesController,
);
router.delete('/:id/images/:imageId',
    isLoggedIn,
    hasPermission('can_update_products'),
    deleteImageController,
);

export default router;
