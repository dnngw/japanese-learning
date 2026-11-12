import { contextBridge, ipcRenderer } from 'electron'

// The only bridge between React and the main process. Inputs are validated
// with zod in the controllers, so nothing here trusts the renderer.
const call = (channel) => (payload) => ipcRenderer.invoke(channel, payload)

contextBridge.exposeInMainWorld('api', {
  app: {
    info: call('app:info'),
  },
  settings: {
    get: call('settings:get'),
    update: call('settings:update'),
    completeOnboarding: call('onboarding:complete'),
    onboardingWordCount: call('onboarding:wordCount'),
    removeOnboardingWords: call('onboarding:removeWords'),
    restartOnboarding: call('onboarding:restart'),
  },
  texts: {
    list: call('texts:list'),
    create: call('texts:create'),
    import: call('texts:import'),
    rename: call('texts:rename'),
    remove: call('texts:remove'),
    analyze: (id) => ipcRenderer.invoke('reader:analyzeText', { id }),
  },
  words: {
    list: call('words:list'),
    counts: call('words:counts'),
    save: call('words:save'),
    setStatus: (id, status) => ipcRenderer.invoke('words:setStatus', { id, status }),
    update: call('words:update'),
    remove: (id) => ipcRenderer.invoke('words:remove', { id }),
  },
  review: {
    queue: call('review:queue'),
    stats: call('review:stats'),
    answer: (cardId, rating, durationMs) => ipcRenderer.invoke('review:answer', { cardId, rating, durationMs }),
  },
  practice: {
    session: call('practice:session'),
    record: call('practice:record'),
  },
  kana: {
    progress: call('kana:progress'),
    record: call('kana:record'),
  },
  dictionary: {
    entry: (id) => ipcRenderer.invoke('dictionary:entry', { id }),
  },
  stats: {
    overview: call('stats:overview'),
  },
  data: {
    exportCsv: call('data:exportCsv'),
    exportApkg: call('data:exportApkg'),
    exportJson: call('data:exportJson'),
    backupDb: call('data:backupDb'),
    restoreJson: call('data:restoreJson'),
  },
  fsrs: {
    status: call('fsrs:status'),
    optimize: call('fsrs:optimize'),
    reset: call('fsrs:reset'),
  },
})
