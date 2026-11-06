import { Router } from 'express';
import { adminDashboard, adminPending, adminUsers, adminActivity } from '../controllers/admin.js';

const router = Router();

router.get('/', adminDashboard);
router.get('/pending', adminPending);
router.get('/users', adminUsers);
router.get('/activity', adminActivity);

export { router as adminRouter };
