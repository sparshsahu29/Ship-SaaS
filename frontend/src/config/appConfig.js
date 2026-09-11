/**
 * Central branding/config. Change these values (and the CSS variables in
 * src/index.css) to re-brand the app. Nothing else should hard-code the
 * product name.
 */
export const appConfig = {
  appName: 'SaaS Starter',
  description: 'A clean foundation for your next product.',
  logo: '/logo.svg',
  supportEmail: 'support@example.com',
  // Kept in sync with --color-primary in src/index.css; useful for meta tags, charts, etc.
  primaryColor: '#18181b',
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, ''),
}

document.title = appConfig.appName
