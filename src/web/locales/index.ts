import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

type LocaleMap = Record<string, string>;

const dir = dirname(fileURLToPath(import.meta.url));

const supportedLocales = ['en', 'ru', 'he'] as const;
export type Locale = (typeof supportedLocales)[number];

const loaded: Partial<Record<Locale, LocaleMap>> = {};

function flatten(obj: Record<string, unknown>, prefix = ''): LocaleMap {
  const result: LocaleMap = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    }
  }

  return result;
}

function loadLocale(locale: Locale): LocaleMap {
  if (!loaded[locale]) {
    const content = readFileSync(join(dir, `${locale}.json`), 'utf8');
    const data = JSON.parse(content) as Record<string, unknown>;
    loaded[locale] = flatten(data);
  }

  return loaded[locale];
}

const en = loadLocale('en');

export const t = (locale: string, key: string): string => {
  const map = supportedLocales.includes(locale as Locale) ? loadLocale(locale as Locale) : en;

  return map[key] ?? en[key] ?? key;
};

const qRegex = /q=([\d.]+)/;

export const detectLocale = (acceptLanguage?: string): Locale => {
  if (!acceptLanguage) {
    return 'en';
  }

  const languages = acceptLanguage
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      const tag = trimmed.split(';')[0] ?? '';
      const code = (tag.split('-')[0] ?? '').toLowerCase();
      const qMatch = qRegex.exec(trimmed);
      const priority = qMatch?.[1] ? Number.parseFloat(qMatch[1]) || 1 : 1;

      return { code, priority };
    })
    .sort((a, b) => b.priority - a.priority);

  for (const lang of languages) {
    if (supportedLocales.includes(lang.code as Locale)) {
      return lang.code as Locale;
    }
  }

  return 'en';
};
