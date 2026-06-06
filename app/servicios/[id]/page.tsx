import { StubPage } from '@/components/StubPage/StubPage';

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  return (
    <StubPage
      title={`Servicio #${id}`}
      milestone="M2 · Servicios público"
      description="Información completa del servicio y botón para reservar. Próximo milestone."
    />
  );
}
