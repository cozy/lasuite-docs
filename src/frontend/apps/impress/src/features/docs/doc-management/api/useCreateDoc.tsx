import { useMutation, useQueryClient } from '@tanstack/react-query';

import { APIError, errorCauses, fetchAPI } from '@/api';

import { Doc } from '../types';

import { KEY_LIST_DOC } from './useDocs';

export const createDoc = async (): Promise<Doc> => {
  const response = await fetchAPI(`documents/`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new APIError('Failed to create the doc', await errorCauses(response));
  }

  return response.json() as Promise<Doc>;
};

interface CreateDocProps {
  onSuccess: (data: Doc) => void;
  dirId?: string;
}

export function useCreateDoc({
  onSuccess,
  dirId = 'io.cozy.files.root-dir',
}: CreateDocProps) {
  const queryClient = useQueryClient();
  return useMutation<Doc, APIError>({
    mutationFn: createDoc,
    onSuccess: async (data) => {
      // @ts-expect-error No typing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await window._cozyBridge.createDocs({
        dirId: dirId,
        externalId: data.id,
      });
      void queryClient.resetQueries({
        queryKey: [KEY_LIST_DOC],
      });
      onSuccess(data);
    },
  });
}
