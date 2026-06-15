'use client';

import { useEffect } from 'react';
import { Card } from '@/components/Card/Card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-12) 0',
      }}
    >
      <Card padding="lg" style={{ maxWidth: 480, textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Algo salió mal
        </h2>
        <p
          style={{
            color: 'var(--color-fg-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Ocurrió un error inesperado. Podés intentar de nuevo.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--weight-medium)',
          }}
        >
          Reintentar
        </button>
      </Card>
    </div>
  );
}
