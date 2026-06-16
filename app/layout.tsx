import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { MapPin } from 'lucide-react';
import { Navbar, type NavUser } from '@/components/Navbar/Navbar';
import { auth } from '@/lib/auth';
import styles from './layout.module.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sistema de Turnos — The Bunker',
  description: 'Reservá tu turno en The Bunker en segundos.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user: NavUser | null = session?.user
    ? { role: session.user.role }
    : null;

  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <div className={styles.layout}>
          <Navbar user={user} />
          <main className={styles.main}>{children}</main>
          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <p className={styles.brand}>The Bunker · Sistema de Turnos</p>
              <p className={styles.contact}>
                <MapPin size={14} aria-hidden="true" /> Díaz, Santa Fe
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
