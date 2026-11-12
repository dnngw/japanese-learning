import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useTexts() {
  return useQuery({ queryKey: ['texts'], queryFn: () => window.api.texts.list() })
}

export function useTextAnalysis(id) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => window.api.texts.analyze(id),
    enabled: id != null,
    placeholderData: keepPreviousData,
  })
}

function useTextMutation(fn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['texts'] }),
  })
}

export const useCreateText = () => useTextMutation((v) => window.api.texts.create(v))
export const useImportText = () => useTextMutation((v) => window.api.texts.import(v))
export const useRenameText = () => useTextMutation((v) => window.api.texts.rename(v))
export const useRemoveText = () => useTextMutation((id) => window.api.texts.remove({ id }))
