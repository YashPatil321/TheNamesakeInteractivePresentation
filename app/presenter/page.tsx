import type { Metadata } from 'next';
import Presenter from '@/components/Presenter';

export const metadata: Metadata = { title: 'Presenter remote · The Namesake Line', robots: { index: false } };

export default function PresenterPage() {
  return <Presenter />;
}
