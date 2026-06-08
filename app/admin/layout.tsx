import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Admin · Sistema de Turnos — Peluquería',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
