import { useMutation, useQueryClient } from '@tanstack/react-query';

import { APIError, errorCauses, fetchAPI } from '@/api';
import { useEditorStore } from '@/docs/doc-editor';
import { Doc } from '@/features/docs';

export type UpdateDocParams = Pick<Doc, 'id'> &
  Partial<Pick<Doc, 'content' | 'title'>>;

export const updateDoc = async ({
  id,
  ...params
}: UpdateDocParams): Promise<Doc> => {
  const response = await fetchAPI(`documents/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...params,
    }),
  });

  if (!response.ok) {
    throw new APIError('Failed to update the doc', await errorCauses(response));
  }

  return response.json() as Promise<Doc>;
};

interface UpdateDocProps {
  onSuccess?: (data: Doc) => void;
  listInvalideQueries?: string[];
}

export function useUpdateDoc({
  onSuccess,
  listInvalideQueries,
}: UpdateDocProps = {}) {
  const queryClient = useQueryClient();
  const { editor } = useEditorStore();

  return useMutation<Doc, APIError, UpdateDocParams>({
    mutationFn: updateDoc,
    onSuccess: async (data) => {
      const markdown = await editor?.blocksToMarkdownLossy();

      void window._cozyBridge.updateDocs({
        docsId: data.id,
        content: markdown,
      });
      listInvalideQueries?.forEach((queryKey) => {
        void queryClient.invalidateQueries({
          queryKey: [queryKey],
        });
      });
      onSuccess?.(data);
    },
  });
}
