// Shared class names so buttons and panels look the same everywhere.
export const ui = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:text-black',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm hover:bg-accent-soft disabled:opacity-50',
  ghost: 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink disabled:opacity-50',
  danger: 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-red-600 disabled:opacity-50',
  card: 'rounded-xl border border-line bg-panel',
  input: 'rounded-lg border border-line bg-panel px-3 py-2 outline-none focus:border-accent',
  page: 'mx-auto max-w-5xl p-8',
  h1: 'text-2xl font-bold',
  sub: 'mt-1 text-sm text-muted',
}
