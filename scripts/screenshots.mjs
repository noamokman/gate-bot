#!/usr/bin/env node
/**
 * Deterministic README screenshots for the web UI.
 *
 *   yarn screenshots         regenerate docs/screenshots/*.png
 *   yarn screenshots:check   render again and diff against the committed images
 *
 * The script seeds a throwaway database with mock people, forges a signed
 * session cookie (no Google login needed), boots the built web server in this
 * process and drives headless Chromium. Everything below is invented data: no
 * real names, emails, door codes or parking spots.
 *
 * Requires `yarn build` first (it renders from dist/).
 */
import { createHmac } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(root, 'docs', 'screenshots');
const workDir = join(root, 'dist', 'screenshots');
const viewport = { width: 1000, height: 200 };
const scale = 2;
const maxDiffRatio = 0.001;
const sessionSecret = 'screenshots-demo-secret-not-a-real-one';
const baseUrl = (port) => `http://127.0.0.1:${port}`;

const args = process.argv.slice(2);
const check = args.includes('--check');
const update = !check;
const outIndex = args.indexOf('--out');
const outDir = outIndex === -1 ? (update ? docsDir : join(workDir, 'rendered')) : resolve(args[outIndex + 1]);

const avatar = (label, background) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" fill="${background}"/>` +
      `<text x="32" y="32" dy="0.35em" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#ffffff">${label}</text>` +
      `</svg>`,
  ).toString('base64')}`;

const people = {
  dana: {
    sourceType: 'web',
    id: 'demo-web-dana',
    name: 'Dana Levi',
    email: 'dana.levi@example.com',
    firstName: 'Dana',
    lastName: 'Levi',
    picture: avatar('DL', '#3b6ea5'),
  },
  alex: {
    sourceType: 'web',
    id: 'demo-web-alex',
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    firstName: 'Alex',
    lastName: 'Morgan',
    picture: avatar('AM', '#6a4c93'),
  },
  priya: {
    sourceType: 'web',
    id: 'demo-web-priya',
    name: 'Priya Shah',
    email: 'priya.shah@example.com',
    firstName: 'Priya',
    lastName: 'Shah',
    picture: avatar('PS', '#2f7d6f'),
  },
  tom: {
    sourceType: 'telegram',
    id: 'demo-tg-tom',
    name: 'Tom Becker',
    username: 'tom_becker',
    firstName: 'Tom',
    lastName: 'Becker',
    picture: avatar('TB', '#a5563b'),
  },
  maya: {
    sourceType: 'telegram',
    id: 'demo-tg-maya',
    name: 'Maya Cohen',
    username: 'maya_cohen',
    firstName: 'Maya',
    lastName: 'Cohen',
    picture: avatar('MC', '#7a6a2f'),
  },
  guest: {
    provider: 'google',
    id: 'demo-web-guest',
    name: 'Robin Adler',
    email: 'robin.adler@example.com',
    firstName: 'Robin',
    lastName: 'Adler',
    picture: avatar('RA', '#4a5a6a'),
    isAdmin: false,
  },
};

const sessionUser = (person, isAdmin) => ({
  provider: 'google',
  id: person.id,
  email: person.email,
  name: person.name,
  firstName: person.firstName,
  lastName: person.lastName,
  picture: person.picture,
  isAdmin,
});

const db = {
  users: [people.dana, people.alex, people.priya, people.tom, people.maya],
  pendingRequests: [
    {
      sourceType: 'web',
      id: 'demo-pending-jordan',
      sourceUserId: 'demo-web-jordan',
      name: 'Jordan Ellis',
      email: 'jordan.ellis@example.com',
      firstName: 'Jordan',
      lastName: 'Ellis',
      picture: avatar('JE', '#8a5a2b'),
      requestedAt: '2026-11-14T06:12:00.000Z',
    },
    {
      sourceType: 'telegram',
      id: 'demo-pending-liam',
      sourceUserId: 'demo-tg-liam',
      name: 'Liam Fischer',
      username: 'liam_fischer',
      firstName: 'Liam',
      lastName: 'Fischer',
      picture: avatar('LF', '#2b6a8a'),
      requestedAt: '2026-11-13T18:41:00.000Z',
    },
    {
      sourceType: 'web',
      id: 'demo-pending-sofia',
      sourceUserId: 'demo-web-sofia',
      name: 'Sofia Rossi',
      email: 'sofia.rossi@example.com',
      firstName: 'Sofia',
      lastName: 'Rossi',
      picture: avatar('SR', '#7d3b6a'),
      requestedAt: '2026-11-12T09:24:00.000Z',
    },
  ],
  activityLog: [
    {
      id: 'demo-activity-1',
      action: 'gate_opened',
      timestamp: '2026-11-14T07:41:12.000Z',
      actor: { id: people.alex.id, name: people.alex.name, email: people.alex.email, picture: people.alex.picture, sourceType: 'web' },
    },
    {
      id: 'demo-activity-2',
      action: 'access_requested',
      timestamp: '2026-11-14T06:12:03.000Z',
      actor: {
        id: 'demo-web-jordan',
        name: 'Jordan Ellis',
        email: 'jordan.ellis@example.com',
        picture: avatar('JE', '#8a5a2b'),
        sourceType: 'web',
      },
    },
    {
      id: 'demo-activity-3',
      action: 'access_allowed',
      timestamp: '2026-11-13T20:05:44.000Z',
      actor: { id: people.dana.id, name: people.dana.name, email: people.dana.email, picture: people.dana.picture, sourceType: 'web' },
      target: 'Liam Fischer',
    },
    {
      id: 'demo-activity-4',
      action: 'access_denied',
      timestamp: '2026-11-13T19:52:10.000Z',
      actor: { id: people.dana.id, name: people.dana.name, email: people.dana.email, picture: people.dana.picture, sourceType: 'web' },
      target: 'Unknown visitor',
    },
    {
      id: 'demo-activity-5',
      action: 'gate_opened',
      timestamp: '2026-11-13T08:03:29.000Z',
      actor: {
        id: people.tom.id,
        name: people.tom.name,
        username: people.tom.username,
        picture: people.tom.picture,
        sourceType: 'telegram',
      },
    },
    {
      id: 'demo-activity-6',
      action: 'user_removed',
      timestamp: '2026-11-12T17:20:00.000Z',
      actor: { id: people.dana.id, name: people.dana.name, email: people.dana.email, picture: people.dana.picture, sourceType: 'web' },
      target: 'Casey Wu',
    },
  ],
};

const pages = [
  { name: 'dashboard', path: '/', user: sessionUser(people.dana, false), theme: 'light' },
  { name: 'dashboard-dark', path: '/', user: sessionUser(people.dana, false), theme: 'dark' },
  { name: 'request-access', path: '/', user: sessionUser(people.guest, false), theme: 'light' },
  { name: 'login', path: '/', user: null, theme: 'light' },
  { name: 'admin', path: '/admin', user: sessionUser(people.dana, true), theme: 'light' },
  { name: 'admin-pending', path: '/admin/pending', user: sessionUser(people.dana, true), theme: 'light' },
  { name: 'admin-users', path: '/admin/users', user: sessionUser(people.dana, true), theme: 'light' },
  { name: 'admin-activity', path: '/admin/activity', user: sessionUser(people.dana, true), theme: 'light' },
];

const freePort = () =>
  new Promise((accept, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => accept(port));
    });
  });

const sleep = (ms) => new Promise((accept) => setTimeout(accept, ms));

const waitForServer = async (url) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${url}/healthz`);
      if (response.ok) return;
    } catch {
      // server not up yet
    }
    await sleep(100);
  }
  throw new Error(`web server did not become healthy at ${url}`);
};

const sign = (sid) => createHmac('sha256', sessionSecret).update(sid).digest('base64').replaceAll('=', '');

const writeSession = async (sessionsDir, sid, user) => {
  await writeFile(
    join(sessionsDir, `${sid}.json`),
    JSON.stringify({
      __lastAccess: Date.now(),
      cookie: { originalMaxAge: 2_592_000_000, httpOnly: true, path: '/', sameSite: 'lax' },
      user,
      locale: 'en',
    }),
  );
  return encodeURIComponent(`s:${sid}.${sign(sid)}`);
};

const bundledChromium = () => {
  try {
    return chromium.executablePath();
  } catch {
    return undefined;
  }
};

// Pin font resolution: the app's stack names Segoe UI/Roboto/Ubuntu first, so a runner that has
// one of those installed renders text differently from a machine that falls back to DejaVu.
// Restricting fontconfig to the fonts we ship in the image keeps local and CI pixel-identical.
const pinFonts = async () => {
  const fontDirs = [
    join(root, 'scripts', 'fonts'),
    join(process.env.HOME ?? '', '.fonts'),
    '/usr/share/fonts/truetype/noto',
    '/usr/share/fonts/noto',
  ].filter((dir) => dir && dir !== join('', '.fonts'));

  const fontconfig = join(workDir, 'fonts.conf');
  await mkdir(join(workDir, 'fontcache'), { recursive: true });
  await writeFile(
    fontconfig,
    `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n${fontDirs
      .map((dir) => `<dir>${dir}</dir>`)
      .join('\n')}\n<cachedir>${join(workDir, 'fontcache')}</cachedir>\n<match target="pattern">\n<test name="family" qual="any"><string>sans-serif</string></test>\n<edit name="family" mode="assign" binding="strong"><string>DejaVu Sans</string></edit>\n</match>\n<match target="font">\n<edit name="hinting" mode="assign"><bool>false</bool></edit>\n<edit name="hintstyle" mode="assign"><const>hintnone</const></edit>\n<edit name="antialias" mode="assign"><bool>true</bool></edit>\n</match>\n</fontconfig>\n`,
  );
  process.env.FONTCONFIG_FILE = fontconfig;
};

const launchBrowser = async () => {
  const candidates = [process.env.CHROME_PATH, process.env.PLAYWRIGHT_CHROMIUM_PATH, bundledChromium()].filter(Boolean);

  for (const executablePath of candidates) {
    try {
      return await chromium.launch({
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--hide-scrollbars',
          '--force-color-profile=srgb',
          '--font-render-hinting=none',
          '--disable-lcd-text',
        ],
      });
    } catch {
      // try the next candidate
    }
  }

  throw new Error(
    'Could not launch Chromium. Run `node node_modules/playwright-core/cli.js install chromium`, or set CHROME_PATH to an existing Chrome binary.',
  );
};

const shoot = async (browser, url, cookie, theme) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    colorScheme: theme,
    reducedMotion: 'reduce',
    timezoneId: 'UTC',
    locale: 'en-US',
  });

  try {
    if (cookie) {
      await context.addCookies([{ name: 'connect.sid', value: cookie, url }]);
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate((value) => window.localStorage.setItem('theme', value), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise((accept) => {
                image.addEventListener('load', accept, { once: true });
                image.addEventListener('error', accept, { once: true });
              }),
          ),
      );
    });

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: viewport.width, height: Math.max(height, 1) });

    const png = await page.screenshot({ fullPage: true, animations: 'disabled' });

    // Quantize: these are flat UI pages, so 256 colors loses nothing visible and halves the file size.
    return sharp(png).png({ palette: true, colors: 256, effort: 10 }).toBuffer();
  } finally {
    await context.close();
  }
};

const compare = async (name, rendered) => {
  const committedPath = join(docsDir, `${name}.png`);
  let committed;

  try {
    committed = await readFile(committedPath);
  } catch {
    return { name, status: 'missing' };
  }

  const expected = PNG.sync.read(committed);
  const actual = PNG.sync.read(rendered);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    return { name, status: 'size', expected: `${expected.width}x${expected.height}`, actual: `${actual.width}x${actual.height}` };
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  const changed = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, { threshold: 0.1, includeAA: false });
  const ratio = changed / (expected.width * expected.height);

  if (changed > 0) {
    const diffPath = join(workDir, 'diff', `${name}.png`);
    await mkdir(dirname(diffPath), { recursive: true });
    await writeFile(diffPath, PNG.sync.write(diff));
  }

  return { name, status: ratio <= maxDiffRatio ? 'match' : 'differ', changed, ratio };
};

const main = async () => {
  try {
    await readFile(join(root, 'dist', 'web', 'app.js'));
  } catch {
    throw new Error('dist/ is missing — run `yarn build` first.');
  }

  await rm(workDir, { recursive: true, force: true });
  await mkdir(join(workDir, 'sessions'), { recursive: true });
  await mkdir(outDir, { recursive: true });

  const port = await freePort();
  const origin = baseUrl(port);
  const sessionsDir = join(workDir, 'sessions');

  await writeFile(join(workDir, 'db.json'), JSON.stringify(db, null, 2));

  Object.assign(process.env, {
    TZ: 'UTC',
    NODE_ENV: 'production',
    WEB_ENABLED: 'true',
    WEB_PORT: String(port),
    WEB_BASE_URL: origin,
    WEB_SESSION_SECRET: sessionSecret,
    WEB_SESSION_PATH: sessionsDir,
    DB_PATH: join(workDir, 'db.json'),
    GOOGLE_CLIENT_ID: 'screenshots-demo',
    GOOGLE_CLIENT_SECRET: 'screenshots-demo',
    GOOGLE_ADMIN_EMAILS: 'dana.levi@example.com',
    DOOR_CODE: '4821#',
    PARKING_INFO: 'Level B2 · spots 14–15',
    FLOOR: 'Floor 3',
    UNIT: 'Unit 12',
    PROPERTY_NOTES: 'Ring twice.\nGarage gate closes automatically after 30 seconds.',
  });

  // Imported after the environment above is in place: the app reads env at import time.
  const { setTelegramUsername } = await import('../dist/services/system.js');
  const { startWebServer } = await import('../dist/web/app.js');

  setTelegramUsername('gate_bot_demo');
  await startWebServer();
  await waitForServer(origin);

  const cookies = {
    allowed: await writeSession(sessionsDir, 'screenshots-allowed-session', sessionUser(people.dana, false)),
    admin: await writeSession(sessionsDir, 'screenshots-admin-session', sessionUser(people.dana, true)),
    guest: await writeSession(sessionsDir, 'screenshots-guest-session', sessionUser(people.guest, false)),
  };

  await pinFonts();

  const browser = await launchBrowser();
  const results = [];

  try {
    for (const page of pages) {
      const cookie = page.user
        ? page.user.isAdmin
          ? cookies.admin
          : page.user.id === people.guest.id
            ? cookies.guest
            : cookies.allowed
        : null;
      const image = await shoot(browser, `${origin}${page.path}`, cookie, page.theme);
      const target = join(outDir, `${page.name}.png`);
      await writeFile(target, image);

      results.push(check ? await compare(page.name, image) : { name: page.name, status: 'written', path: relative(root, target) });
      console.log(check ? `${page.name}: ${results.at(-1).status}` : `wrote ${relative(root, target)}`);
    }
  } finally {
    await browser.close();
  }

  if (!check) return 0;

  const failed = results.filter((result) => result.status !== 'match');

  for (const result of failed) {
    console.log(
      result.status === 'differ'
        ? `${result.name}: ${result.changed} pixels differ (${(result.ratio * 100).toFixed(3)}%) — see ${relative(root, join(workDir, 'diff', `${result.name}.png`))}`
        : `${result.name}: ${result.status}${result.expected ? ` (committed ${result.expected}, rendered ${result.actual})` : ''}`,
    );
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} screenshot(s) out of date. Run \`yarn screenshots\` and commit the result.`);
    return 1;
  }

  console.log(`\nAll ${results.length} screenshots match.`);
  return 0;
};

// The express server keeps the event loop alive, so leave explicitly once stdout is flushed.
const finish = async (code) => {
  await new Promise((accept) => process.stdout.write('', accept));
  process.exit(code);
};

main()
  .then(finish)
  .catch(async (error) => {
    console.error(error);
    await finish(1);
  });
