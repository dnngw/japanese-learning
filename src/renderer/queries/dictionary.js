import { useQuery } from '@tanstack/react-query'

export function useEntry(id) {
  return useQuery({
    queryKey: ['entry', id],
    queryFn: () => window.api.dictionary.entry(id),
    enabled: id != null,
    staleTime: Infinity, // dict.db is read-only
  })
}
