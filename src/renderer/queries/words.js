import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useWords(filters) {
  return useQuery({
    queryKey: ['words', filters],
    queryFn: () => window.api.words.list(filters),
    placeholderData: keepPreviousData,
  })
}

export function useWordCounts() {
  return useQuery({ queryKey: ['word-counts'], queryFn: () => window.api.words.counts() })
}

// Any change to saved words also changes highlights, scores, reviews and stats.
function useWordMutation(fn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ['words', 'word-counts', 'analysis', 'review', 'stats']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export const useSaveWord = () => useWordMutation((input) => window.api.words.save(input))
export const useSetWordStatus = () => useWordMutation(({ id, status }) => window.api.words.setStatus(id, status))
export const useUpdateWord = () => useWordMutation((values) => window.api.words.update(values))
export const useRemoveWord = () => useWordMutation((id) => window.api.words.remove(id))
