import { Spinner } from '@/components/Spinner/Spinner';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--space-12) 0',
      }}
    >
      <Spinner size="lg" label="Cargando" />
    </div>
  );
}
