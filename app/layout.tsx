import type { Metadata, Viewport } from 'next';
import { Caveat, Courier_Prime, Rozha_One, Spectral } from 'next/font/google';
import './globals.css';
import './styles/fp.css';
import './styles/scenes.css';
import './styles/choices.css';
import './styles/now.css';
import './styles/archive.css';

const rozha = Rozha_One({ weight: '400', subsets: ['latin'], variable: '--font-rozha', display: 'swap' });
const spectral = Spectral({ weight: ['400', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-spectral', display: 'swap' });
const courier = Courier_Prime({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-courier', display: 'swap' });
const caveat = Caveat({ weight: '600', subsets: ['latin'], variable: '--font-caveat', display: 'swap' });

export const metadata: Metadata = {
  title: 'The Namesake Line',
  description: "Ride a steam train through Gogol Ganguli's life, 1961–2000. An interactive timeline of Jhumpa Lahiri's The Namesake.",
  openGraph: {
    title: 'The Namesake Line',
    description: "Ride a steam train through Gogol Ganguli's life, 1961–2000.",
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d1326',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rozha.variable} ${spectral.variable} ${courier.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
