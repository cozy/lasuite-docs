import { Button } from '@gouvfr-lasuite/cunningham-react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components';
import { useCreateDoc } from '@/docs/doc-management';
import { useSkeletonStore } from '@/features/skeletons';

import { useLeftPanelStore } from '../stores';
import { useOpenBuro } from '@/features/openburo/OpenBuroProvider';

export const LeftPanelOpenButton = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { closePanel } = useLeftPanelStore();
  const { setIsSkeletonVisible } = useSkeletonStore();
  const [isNavigating, setIsNavigating] = useState(false);

  const openBuro = useOpenBuro();

  const handleClick = () => {
    openBuro.openFile().then((res) => {
      console.log(res)
    }).catch((err) => {
      console.error('Error opening file:', err);
    });
  };

  const isLoading = false;

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
