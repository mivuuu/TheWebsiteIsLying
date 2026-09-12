// The story uses /rules etc.; hosting may mount the application below a repository path.
export const BASE_PATH = import.meta.env.BASE_URL;
export const routeUrl = page => `${BASE_PATH}${page || ''}`;
export function routeFromPath(pathname) {
  return pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname.replace(/^\//, '');
}
