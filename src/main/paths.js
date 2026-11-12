import { app } from 'electron'
import path from 'node:path'

// Files shipped next to the app (electron-builder extraResources) in production,
// or in the project root during development.
const resource = (...parts) =>
  app.isPackaged ? path.join(process.resourcesPath, ...parts) : path.join(app.getAppPath(), ...parts)

export const paths = {
  userDb: () => path.join(app.getPath('userData'), 'user.db'),
  migrations: () => resource('drizzle'),
  // Built by `npm run dict:build` into resources/; shipped as <resources>/dict.db.
  dictDb: () => (app.isPackaged ? path.join(process.resourcesPath, 'dict.db') : resource('resources', 'dict.db')),
  // kuromoji reads its dictionary with fs, which also works inside app.asar.
  kuromojiDict: () => path.join(app.getAppPath(), 'node_modules', 'kuromoji', 'dict'),
}
