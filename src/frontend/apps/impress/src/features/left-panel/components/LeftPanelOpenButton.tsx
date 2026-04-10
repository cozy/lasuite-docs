import {
  Button,
  VariantType,
  useToastProvider,
} from '@gouvfr-lasuite/cunningham-react';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components';
import { useConfig } from '@/core/config/api/useConfig';
import {
  ContentTypes,
  useImportDoc,
} from '@/features/docs/docs-grid/api/useImportDoc';
import { useOpenBuro } from '@/features/openburo/OpenBuroProvider';
import { useSkeletonStore } from '@/features/skeletons';

import { useLeftPanelStore } from '../stores';

export const LeftPanelOpenButton = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToastProvider();
  const { closePanel } = useLeftPanelStore();
  const { setIsSkeletonVisible } = useSkeletonStore();
  const { data: config } = useConfig();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const openBuro = useOpenBuro();
  const { mutateAsync: importDocAsync, isPending: isImporting } =
    useImportDoc();

  const allowedMimeType = useMemo(() => {
    const configuredExtensions =
      config?.CONVERSION_FILE_EXTENSIONS_ALLOWED?.map((extension) =>
        extension.toLowerCase(),
      );
    const extensions =
      configuredExtensions && configuredExtensions.length > 0
        ? configuredExtensions
        : ['.docx', '.md', '.markdown'];
    const mimeTypes = new Set<string>();

    if (extensions.some((extension) => extension === '.docx')) {
      mimeTypes.add(ContentTypes.Docx);
    }

    if (
      extensions.some(
        (extension) => extension === '.md' || extension === '.markdown',
      )
    ) {
      mimeTypes.add(ContentTypes.Markdown);
    }

    return Array.from(mimeTypes);
  }, [config?.CONVERSION_FILE_EXTENSIONS_ALLOWED]);

  const importableExtensions = useMemo(() => {
    const configuredExtensions =
      config?.CONVERSION_FILE_EXTENSIONS_ALLOWED?.map((extension) =>
        extension.toLowerCase(),
      );
    return configuredExtensions && configuredExtensions.length > 0
      ? configuredExtensions
      : ['.docx', '.md', '.markdown'];
  }, [config?.CONVERSION_FILE_EXTENSIONS_ALLOWED]);

  const isResultCompatible = (result: { name: string; mimeType: string }) => {
    const fileName = result.name.toLowerCase();
    const byExtension = importableExtensions.some((extension) =>
      fileName.endsWith(extension),
    );
    const byMime =
      result.mimeType === ContentTypes.Docx ||
      result.mimeType === ContentTypes.Markdown;

    return byExtension || byMime;
  };

  const handleClick = async () => {
    setIsOpening(true);
    try {
      const res = await openBuro.openFile({
        allowedMimeType,
        multiple: false,
        type: "payload",
      });


      if (res.status === 'error') {
        toast(res.message, VariantType.ERROR);
        return;
      }

      const selectedFile = res.results[0];
      console.log('Selected file from OpenBuro:', selectedFile);
      if (!selectedFile) {
        toast(
          t(`The document "{{documentName}}" import has failed`, {
            documentName: '',
          }),
          VariantType.ERROR,
        );
        return;
      }

      if (!isResultCompatible(selectedFile)) {
        toast(
          t(
            'The document "{{documentName}}" import has failed (only .docx and .md files are allowed)',
            {
              documentName: selectedFile.name,
            },
          ),
          VariantType.ERROR,
        );
        return;
      }

      const fileBase64Data = selectedFile.payload;
      const fileBase64Url = `data:${selectedFile.mimeType};base64,${fileBase64Data}`;

      // Fetch the file as a blob to get its MIME type and create a File object
      const response = await fetch(fileBase64Url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file data: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Fetched blob from base64 data:', blob);
      const mimeType = blob.type || selectedFile.mimeType || 'application/octet-stream';
      const file = new File([blob], selectedFile.name, {
        type: mimeType,
      });

      const importedDoc = await importDocAsync([file, mimeType]);

      setIsNavigating(true);
      await router.push(`/docs/${importedDoc.id}`);
      closePanel({ type: 'mobile' });
      setIsNavigating(false);
    } catch (err) {
      setIsNavigating(false);
      setIsSkeletonVisible(false);
      console.error('Error opening file:', err);
    } finally {
      setIsOpening(false);
    }
  };

  const isLoading = isOpening || isImporting || isNavigating;

  return (
    <Button
      data-testid="open-doc-button"
      color="brand"
      variant="bordered"
      onClick={handleClick}
      icon={<Icon $color="inherit" iconName="folder" aria-hidden="true" />}
      disabled={isLoading}
    >
      {t('Open')}
    </Button>
  );
};
