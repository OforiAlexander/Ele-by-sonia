import { Router } from 'express';
import authRoutes from './auth';
import permissionsRoutes from './permissions';
import staffRoutes from './staff';
import rolesRoutes from './roles';
import productsRoutes from './products';
import variantsRoutes from './variants';
import stockRoutes from './stock';
import salesRoutes from './sales';
import deliveryRoutes from './delivery';
import reportsRoutes from './reports';
import settingsRoutes from './settings';
import storeRoutes from './store';
import ordersRoutes from './orders';
import paymentsRoutes from './payments';

const router = Router();

router.use('/auth', authRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/staff', staffRoutes);
router.use('/roles', rolesRoutes);
router.use('/products', productsRoutes);
router.use('/variants', variantsRoutes);
router.use('/stock', stockRoutes);
router.use('/sales', salesRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/store', storeRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);

export default router;
