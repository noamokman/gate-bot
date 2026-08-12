import { Router } from 'express';
import { adminDashboard, adminPending, adminUsers } from '../controllers/admin.js';

const router = Router();

router.get('/', adminDashboard);
router.get('/pending', adminPending);
router.get('/users', adminUsers);

export { router as adminRouter };
