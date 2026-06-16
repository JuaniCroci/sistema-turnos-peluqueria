import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistema de Turnos — The Bunker',
    short_name: 'The Bunker',
    description: 'Reservá tu turno en The Bunker en segundos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [{ src: '/icon.png', sizes: 'any', type: 'image/png' }],
  };
}
