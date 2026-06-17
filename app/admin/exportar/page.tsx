import type { Metadata } from 'next';
import { ExportClient } from './ExportClient';

export const metadata: Metadata = {
  title: 'Exportar turnos · Admin — The Bunker',
};

export default function ExportarPage() {
  return <ExportClient />;
}
