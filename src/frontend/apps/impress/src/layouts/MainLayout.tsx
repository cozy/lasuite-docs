import { PropsWithChildren, useEffect } from 'react';
import { css } from 'styled-components';

import { Box } from '@/components';
import { useCunninghamTheme } from '@/cunningham';
import { Header } from '@/features/header';
import { HEADER_HEIGHT } from '@/features/header/conf';
import { LeftPanel } from '@/features/left-panel';
import { MAIN_LAYOUT_ID } from '@/layouts/conf';
import { useResponsiveStore } from '@/stores';
import { useCreateDoc } from '@/features/docs';
import { useRouter } from 'next/router';

type MainLayoutProps = {
  backgroundColor?: 'white' | 'grey';
};

export function MainLayout({
  children,
  backgroundColor = 'white',
}: PropsWithChildren<MainLayoutProps>) {
  const { isDesktop } = useResponsiveStore();
  const { colorsTokens } = useCunninghamTheme();
  const router = useRouter();

  const currentBackgroundColor = !isDesktop ? 'white' : backgroundColor;
  const hasContent = !window._cozyBridge;

  const shouldShowLeftPanel = !window._cozyBridge;

  const { mutate: createDoc, isPending: isCreatingDoc } = useCreateDoc({
    onSuccess: (doc) => {
      router.push(`/docs/${doc.id}`);
    },
  });

  useEffect(() => {
    window.onmessage = function (e) {
      if (e.data == undefined || e.data == null || typeof e.data !== "string") return;
      if (e.data.startsWith("newDoc")) {
        createDoc();
      }
      if (e.data.startsWith("openFile:")) {
        const fileId = e.data.split("openFile:")[1].trim();
        router.push(`/docs/${fileId}`);
      }
    };
  }, []);

  return (
    <Box className="--docs--main-layout">
      <Header hasContent={hasContent} />
      <Box
        $direction="row"
        $margin={{ top: `${hasContent ? HEADER_HEIGHT : 0}px` }}
        $width="100%"
      >
        {shouldShowLeftPanel && <LeftPanel />}
        <Box
          as="main"
          id={MAIN_LAYOUT_ID}
          $align="center"
          $flex={1}
          $width="100%"
          $height={`calc(100dvh - ${hasContent ? HEADER_HEIGHT : 0}px)`}
          $padding={{
            all: isDesktop ? 'base' : '0',
          }}
          $background={
            currentBackgroundColor === 'white'
              ? colorsTokens['greyscale-000']
              : colorsTokens['greyscale-050']
          }
          $css={css`
            overflow-y: auto;
            overflow-x: clip;
          `}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
