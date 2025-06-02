import { Loader } from '@openfun/cunningham-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { Box } from '@/components';
import { useCreateDoc } from '@/docs/doc-management';
import { MainLayout } from '@/layouts';
import { NextPageWithLayout } from '@/types/next';

export function NewDocLayout() {
  const {
    query: { dir_id },
  } = useRouter();

  if (typeof dir_id !== 'string') {
    return null;
  }

  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>

      <MainLayout>
        <NewDocPage dir_id={dir_id} />
      </MainLayout>
    </>
  );
}

interface NewDocProps {
  dir_id: string;
}

const NewDocPage = ({ dir_id }: NewDocProps) => {
  const router = useRouter();
  const [hasCreated, setHasCreated] = useState(false);

  const { mutate: createDoc } = useCreateDoc({
    onSuccess: (doc) => {
      void router.push(`/docs/${doc.id}`);
    },
    dirId: dir_id,
  });

  useEffect(() => {
    if (!hasCreated) {
      setHasCreated(true);
      createDoc();
    }
  }, [hasCreated, createDoc]);

  return (
    <Box $align="center" $justify="center" $height="100%">
      <Loader />
    </Box>
  );
};

const Page: NextPageWithLayout = () => {
  return null;
};

Page.getLayout = function getLayout() {
  return <NewDocLayout />;
};

export default Page;
