import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import session from 'express-session';
import { webConfig } from '../framework/environment.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { adminRouter } from './routes/admin.js';
import { ensureAuth, ensureAdmin } from './middleware.js';
import { detectLocale, t } from './locales/index.js';

const viewsDir = join(dirname(fileURLToPath(import.meta.url)), 'views');

export const startWebServer = () => {
  if (!webConfig) {
    return;
  }

  const { webPort, webSessionSecret } = webConfig;

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', viewsDir);

  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: webSessionSecret,
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.use((req, res, next) => {
    const locale = req.session.locale ?? detectLocale(req.headers['accept-language']);

    req.session.locale = locale;

    res.locals.t = (key: string) => t(locale, key);
    res.locals.locale = locale;

    next();
  });

  app.post('/language', (req, res) => {
    const locale = req.body.locale as string | undefined;

    if (locale && ['en', 'ru', 'he'].includes(locale)) {
      req.session.locale = locale;
    }

    res.redirect(req.headers.referer ?? '/');
  });

  app.get('/language', (req, res) => {
    const locale = req.query.locale as string | undefined;

    if (locale && ['en', 'ru', 'he'].includes(locale)) {
      req.session.locale = locale;
    }

    res.redirect(req.headers.referer ?? '/');
  });

  app.use('/auth', authRouter);
  app.use('/dashboard', ensureAuth, dashboardRouter);
  app.use('/admin', ensureAuth, ensureAdmin, adminRouter);

  app.get('/', (req, res) => {
    if (req.session.user) {
      res.redirect('/dashboard');
      return;
    }

    res.render('login');
  });

  app.listen(webPort, () => {
    console.log(`Web server started on port ${webPort}`);
  });
};
