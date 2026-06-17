export type Role = 'client' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  role: Role;
  created_at: string;
}

export interface Service {
  id: number;
  category: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  created_at: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export interface Appointment {
  id: number;
  user_id: number | null;
  service_id: number;
  appointment_at: string;
  status: AppointmentStatus;
  notes: string | null;
  client_name: string | null;
  created_at: string;
}

export interface Page<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
