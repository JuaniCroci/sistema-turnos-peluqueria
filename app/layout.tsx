import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { Navbar, type NavUser } from '@/components/Navbar/Navbar';
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
  title: 'Sistema de Turnos — Peluquería',
  description: 'Reservá tu turno en la peluquería en segundos.',
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // M2 (NextAuth) leera la sesion del cookie y pasara el user real.
  // Por ahora, sin auth, siempre se renderiza logged out.
  const user: NavUser | null = null;

  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <div className={styles.layout}>
          <Navbar user={user} />
          <main className={styles.main}>{children}</main>
          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <p className={styles.brand}>Peluquería · Sistema de Turnos</p>
              <p className={styles.contact}>
                Av. Siempre Viva 742 · Lunes a sábados de 9 a 20 hs
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
