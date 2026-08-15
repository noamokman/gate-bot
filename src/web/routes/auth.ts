import { Router } from 'express';
import { googleStart, googleCallback } from '../controllers/auth.js';

const router = Router();

router.get('/google', googleStart);
router.get('/google/callback', googleCallback);

export { router as authRouter };
