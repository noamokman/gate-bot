import { Router } from 'express';
import { ensureApiAuth, ensureApiAdmin, ensureCsrf } from '../middleware.js';
import { passwordLogin, logout } from '../controllers/auth.js';
import { getStatus, openGate, requestAccess } from '../controllers/dashboard.js';
import { changeLanguage } from '../controllers/language.js';
import { allowRequest, denyRequest, removeUser } from '../controllers/admin.js';

const router = Router();

router.post('/auth/password', ensureCsrf, passwordLogin);
router.post('/auth/logout', ensureCsrf, ensureApiAuth, logout);
router.get('/status', ensureApiAuth, getStatus);
router.post('/open', ensureCsrf, ensureApiAuth, openGate);
router.post('/request-access', ensureCsrf, ensureApiAuth, requestAccess);
router.post('/language', ensureCsrf, ensureApiAuth, changeLanguage);
router.post('/admin/pending/:id/allow', ensureCsrf, ensureApiAuth, ensureApiAdmin, allowRequest);
router.post('/admin/pending/:id/deny', ensureCsrf, ensureApiAuth, ensureApiAdmin, denyRequest);
router.post('/admin/users/:sourceType/:id/remove', ensureCsrf, ensureApiAuth, ensureApiAdmin, removeUser);

export { router as apiRouter };
