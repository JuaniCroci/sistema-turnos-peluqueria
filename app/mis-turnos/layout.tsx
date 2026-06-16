import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mis turnos · Sistema de Turnos — The Bunker',
};

export default function MisTurnosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
