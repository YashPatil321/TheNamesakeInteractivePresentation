import type { Metadata } from 'next';
import Scenes from '@/components/Scenes';

export const metadata: Metadata = { title: 'Our Scenes · The Namesake Line' };

export default function ScenesPage() {
  return <Scenes mode="page" />;
}
