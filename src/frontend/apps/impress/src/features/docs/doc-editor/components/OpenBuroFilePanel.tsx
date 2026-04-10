import {
  EmbedTab,
  FilePanelProps,
  UploadTab,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
} from '@blocknote/react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOpenBuro } from '@/features/openburo/OpenBuroProvider';

const OPEN_BURO_MIME_EXPANSION: Record<string, string[]> = {
  'image/*': ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
  'video/*': [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-m4v',
  ],
  'audio/*': [
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/flac',
    'audio/aac',
    'audio/x-m4a',
  ],
};

const normalizeOpenBuroMimeTypes = (mimeTypes: string[]) => {
  if (mimeTypes.length === 0 || mimeTypes.includes('*/*')) {
    return undefined;
  }

  const expanded = mimeTypes.flatMap((mimeType) => {
    if (OPEN_BURO_MIME_EXPANSION[mimeType]) {
      return OPEN_BURO_MIME_EXPANSION[mimeType];
    }
    return [mimeType];
  });

  return Array.from(new Set(expanded));
};

const OpenBuroImportTab = ({
  blockId,
  setLoading,
}: FilePanelProps & { setLoading: (loading: boolean) => void }) => {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const openBuro = useOpenBuro();
  const { t } = useTranslation();
  const [importFailed, setImportFailed] = useState(false);

  const block = editor.getBlock(blockId);
  const acceptedMimeTypes = useMemo(() => {
    if (!block) {
      return undefined;
    }

    const fileBlockAccept =
      (
        editor.schema.blockSpecs[block.type] as {
          implementation?: { meta?: { fileBlockAccept?: string[] } };
        }
      )?.implementation?.meta?.fileBlockAccept || [];

    return normalizeOpenBuroMimeTypes(fileBlockAccept);
  }, [block, editor]);

  const handleOpenBuroImport = useCallback(async () => {
    if (!block) {
      setImportFailed(true);
      return;
    }

    setLoading(true);
    setImportFailed(false);

    try {
      const response = await openBuro.openFile({
        allowedMimeType: acceptedMimeTypes,
        multiple: false,
        type: 'payload',
      });

      if (response.status === 'error') {
        setImportFailed(true);
        return;
      }

      const selectedFile = response.results[0];
      if (
        !selectedFile ||
        !selectedFile.name ||
        typeof selectedFile.payload !== 'string'
      ) {
        setImportFailed(true);
        return;
      }

      const fileBase64Url = `data:${selectedFile.mimeType};base64,${selectedFile.payload}`;
      const uploadedResponse = await fetch(fileBase64Url);
      if (!uploadedResponse.ok) {
        setImportFailed(true);
        return;
      }

      const blob = await uploadedResponse.blob();
      const mimeType =
        blob.type || selectedFile.mimeType || 'application/octet-stream';
      const file = new File([blob], selectedFile.name, { type: mimeType });

      if (editor.uploadFile === undefined) {
        setImportFailed(true);
        return;
      }

      let updateData = await editor.uploadFile(file, blockId);
      if (typeof updateData === 'string') {
        updateData = {
          props: {
            name: file.name,
            url: updateData,
          },
        };
      }

      editor.updateBlock(blockId, updateData);
    } catch {
      setImportFailed(true);
    } finally {
      setLoading(false);
    }
  }, [acceptedMimeTypes, block, blockId, editor, openBuro, setLoading]);

  if (!Components) {
    return null;
  }

  return (
    <Components.FilePanel.TabPanel className="bn-tab-panel">
      <Components.FilePanel.Button
        className="bn-button"
        onClick={() => void handleOpenBuroImport()}
      >
        {t('Import from OpenBuro')}
      </Components.FilePanel.Button>
      {importFailed && (
        <div className="bn-error-text">{t('Failed to import file')}</div>
      )}
    </Components.FilePanel.TabPanel>
  );
};

export const OpenBuroFilePanel = (props: FilePanelProps) => {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const dict = useDictionary();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const block = editor.getBlock(props.blockId);
  const hasOpenBuroImportTab = useMemo(() => {
    if (!block) {
      return false;
    }

    const fileBlockAccept =
      (
        editor.schema.blockSpecs[block.type] as {
          implementation?: { meta?: { fileBlockAccept?: string[] } };
        }
      )?.implementation?.meta?.fileBlockAccept || [];

    return fileBlockAccept.length > 0;
  }, [block, editor]);

  const tabs = useMemo(() => {
    return [
      ...(hasOpenBuroImportTab
        ? [
            {
              name: t('OpenBuro'),
              tabPanel: (
                <OpenBuroImportTab
                  blockId={props.blockId}
                  setLoading={setLoading}
                />
              ),
            },
          ]
        : []),
      ...(editor.uploadFile !== undefined
        ? [
            {
              name: dict.file_panel.upload.title,
              tabPanel: (
                <UploadTab blockId={props.blockId} setLoading={setLoading} />
              ),
            },
          ]
        : []),
      {
        name: dict.file_panel.embed.title,
        tabPanel: <EmbedTab blockId={props.blockId} />,
      },
    ];
  }, [
    dict.file_panel.embed.title,
    dict.file_panel.upload.title,
    editor.uploadFile,
    hasOpenBuroImportTab,
    props.blockId,
    t,
  ]);

  const [openTab, setOpenTab] = useState(tabs[0]?.name ?? '');

  if (!Components) {
    return null;
  }

  return (
    <Components.FilePanel.Root
      className="bn-panel"
      defaultOpenTab={openTab}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
};
