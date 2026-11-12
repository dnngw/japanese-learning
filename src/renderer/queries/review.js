import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useReviewQueue() {
  return useQuery({ queryKey: ['review', 'queue'], queryFn: () => window.api.review.queue() })
}

export function useReviewStats() {
  return useQuery({ queryKey: ['review', 'stats'], queryFn: () => window.api.review.stats(), refetchInterval: 60_000 })
}

export function useAnswerCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, rating, durationMs }) => window.api.review.answer(cardId, rating, durationMs),
    onSuccess: () => {
      // Mature cards change what counts as "known" in the reader.
      for (const key of ['review', 'analysis', 'stats', 'kana-progress', 'words']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}
