import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, Response } from 'express';
import ko from './i18n/ko.json';
import en from './i18n/en.json';

const CATALOGS: Record<string, Record<string, unknown>> = { ko, en };
const localeStore = new AsyncLocalStorage<string>();

export function resolveLocale(header?: string | string[]): string {
  const raw = Array.isArray(header) ? header[0] : header;
  const primary = String(raw || 'ko').toLowerCase().split(',')[0].trim().split('-')[0];
  return primary === 'en' ? 'en' : 'ko';
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  localeStore.run(resolveLocale(req.headers['accept-language']), () => next());
}

function lookup(tree: unknown, code: string): string | undefined {
  const value = code.split('.').reduce<unknown>((node, part) => {
    if (!node || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, tree);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] === undefined ? `{${key}}` : String(params[key]),
  );
}

export function localeStoreRun<T>(lang: string, fn: () => T): T {
  return localeStore.run(lang, fn);
}

export function tApi(code: string, params?: Record<string, string | number>): string {
  const lang = localeStore.getStore() || 'ko';
  const template = lookup(CATALOGS[lang], code) ?? lookup(CATALOGS.ko, code);
  if (!template) return code;
  return interpolate(template, params);
}
