import { Router } from 'express';
import { ensureApiAuth, ensureApiAdmin } from '../middleware.js';
import { passwordLogin, logout } from '../controllers/auth.js';
import { getStatus, openGate, requestAccess } from '../controllers/dashboard.js';
import { changeLanguage } from '../controllers/language.js';
import { allowRequest, denyRequest, removeUser } from '../controllers/admin.js';

const router = Router();

router.post('/auth/password', passwordLogin);
router.post('/auth/logout', ensureApiAuth, logout);
router.get('/status', ensureApiAuth, getStatus);
router.post('/open', ensureApiAuth, openGate);
router.post('/request-access', ensureApiAuth, requestAccess);
router.post('/language', ensureApiAuth, changeLanguage);
router.post('/admin/pending/:id/allow', ensureApiAdmin, allowRequest);
router.post('/admin/pending/:id/deny', ensureApiAdmin, denyRequest);
router.post('/admin/users/:sourceType/:id/remove', ensureApiAdmin, removeUser);

export { router as apiRouter };
