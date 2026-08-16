import { Router } from 'express';
import { aboutPage } from '../controllers/about.js';

const router = Router();

router.get('/about', aboutPage);

export { router as aboutRouter };
