import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useStartPractice() {
  return useMutation({ mutationFn: ({ mode, count }) => window.api.practice.session({ mode, count }) })
}

function useRecord(fn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ['review', 'stats', 'kana-progress', 'analysis']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export const useRecordPractice = () => useRecord((results) => window.api.practice.record({ results }))
export const useRecordKana = () => useRecord(({ results, mode }) => window.api.kana.record({ results, mode }))

export function useKanaProgress() {
  return useQuery({ queryKey: ['kana-progress'], queryFn: () => window.api.kana.progress() })
}
