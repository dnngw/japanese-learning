import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useAppInfo() {
  return useQuery({ queryKey: ['app-info'], queryFn: () => window.api.app.info(), staleTime: Infinity })
}

export function useAppSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() })
}

// Settings change scheduling, highlights and statistics: refresh everything.
function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export function useUpdateSettings() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (values) => window.api.settings.update(values), onSuccess: invalidate })
}

export function useCompleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values) => window.api.settings.completeOnboarding(values),
    onSuccess: (res) => {
      // Update the cache before navigating, otherwise the layout still sees
      // `onboarded: false` and sends the user back to the welcome screen.
      qc.setQueryData(['settings'], res.settings)
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'settings' })
    },
  })
}

export function useOnboardingWordCount() {
  return useQuery({ queryKey: ['onboarding-words'], queryFn: () => window.api.settings.onboardingWordCount() })
}

export function useRemoveOnboardingWords() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: () => window.api.settings.removeOnboardingWords(), onSuccess: invalidate })
}

export function useRestartOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => window.api.settings.restartOnboarding(),
    onSuccess: (settings) => qc.setQueryData(['settings'], settings),
  })
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => window.api.stats.overview() })
}

export function useFsrsStatus() {
  return useQuery({ queryKey: ['fsrs-status'], queryFn: () => window.api.fsrs.status() })
}

export function useOptimizeFsrs() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: () => window.api.fsrs.optimize(), onSuccess: invalidate })
}

export function useResetFsrs() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: () => window.api.fsrs.reset(), onSuccess: invalidate })
}

// Export/backup actions open a native save dialog; result is null when cancelled.
export function useDataAction(name) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (payload) => window.api.data[name](payload),
    onSuccess: (res) => {
      if (res && name === 'restoreJson') invalidate()
    },
  })
}
