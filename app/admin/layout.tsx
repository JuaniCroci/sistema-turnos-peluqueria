import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import styles from './AdminLayout.module.css';

export const metadata: Metadata = {
  title: 'Admin · Sistema de Turnos — The Bunker',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
