const normalizedBase = import.meta.env.BASE_URL.replace(/\/$/, '');

export function appPathname() {
  const { pathname } = window.location;
  if (normalizedBase && (pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`))) {
    return pathname.slice(normalizedBase.length) || '/';
  }
  return pathname;
}

export function appUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || '/';
}

export function assetUrl(path) {
  if (!path || /^(?:https?:|data:|blob:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
