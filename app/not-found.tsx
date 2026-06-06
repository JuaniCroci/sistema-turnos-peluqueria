import Link from 'next/link';
import { Home } from 'lucide-react';
import { Card } from '@/components/Card/Card';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-12) 0',
      }}
    >
      <Card
        padding="lg"
        style={{
          maxWidth: 480,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-accent)',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-fg)',
          }}
        >
          No encontramos esa ruta
        </h1>
        <p style={{ color: 'var(--color-fg-muted)', lineHeight: 'var(--leading-relaxed)' }}>
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--weight-medium)',
            textDecoration: 'none',
            marginTop: 'var(--space-3)',
          }}
        >
          <Home size={16} aria-hidden="true" />
          Volver al inicio
        </Link>
      </Card>
    </div>
  );
}
