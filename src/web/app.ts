import { join } from 'node:path';
import express from 'express';
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import { webConfig } from '../framework/environment.js';
import { getTelegramUsername, waitForTelegramUsername } from '../services/system.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { aboutRouter } from './routes/about.js';
import { adminRouter } from './routes/admin.js';
import { apiRouter } from './routes/api.js';
import { ensureAuth, ensureAdmin } from './middleware.js';
import { detectLocale, t } from './locales/index.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
const FileStore = sessionFileStore(session);
const viewsDir = join(import.meta.dirname, 'views');

export const startWebServer = async () => {
  if (!webConfig) {
    return;
  }

  await waitForTelegramUsername();

  const { webPort, webSessionSecret, webSessionPath, webBaseUrl } = webConfig;

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', viewsDir);

  app.use('/assets', express.static(join(import.meta.dirname, 'assets')));

  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: webSessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new FileStore({
        path: webSessionPath,
        ttl: 30 * 24 * 60 * 60,
        retries: 0,
      }),
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: webBaseUrl.startsWith('https://'),
      },
    }),
  );

  app.use((req, res, next) => {
    const locale = req.session.locale ?? detectLocale(req.headers['accept-language']);

    req.session.locale = locale;

    res.locals.t = (key: string) => t(locale, key);
    res.locals.locale = locale;
    res.locals.telegramUsername = getTelegramUsername();

    next();
  });

  app.use('/auth', authRouter);
  app.use('/api', apiRouter);
  app.use('/', dashboardRouter);
  app.use('/', aboutRouter);
  app.use('/admin', ensureAuth, ensureAdmin, adminRouter);

  app.use((_req, res) => {
    res.redirect('/');
  });

  app.listen(webPort, () => {
    console.log(`Web server started on port ${webPort}`);
  });
};
