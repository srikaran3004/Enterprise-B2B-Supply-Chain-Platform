import { environment } from '../../../environments/environment';

export function resolveCatalogImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const base = environment.useDirect
    ? environment.catalogServiceUrl
    : (environment.gatewayUrl || environment.catalogServiceUrl);

  return base + url;
}
