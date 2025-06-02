import { Head, Html, Main, NextScript } from 'next/document';

export default function RootLayout() {
  return (
    <Html>
      <Head />
      <script src="https://unpkg.com/cozy-external-bridge@0.12.0/dist/embedded/bundle.js" />
      <body suppressHydrationWarning={process.env.NODE_ENV === 'development'}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
