/** Collapses `/about/`, `//about` and `/about` to `/about`; GitHub Pages serves routes with a trailing slash. */
export const normalizePath = (pathname: string) => `/${pathname.split('/').filter(Boolean).join('/')}`
