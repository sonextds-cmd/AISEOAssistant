import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI SEO Work Assistant',
  description: 'AI SEO checker inspired by Yoast SEO and modern AI-search content structure principles.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
