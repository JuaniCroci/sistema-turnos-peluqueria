import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ServicesListPage } from './pages/ServicesListPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { NewAppointmentPage } from './pages/NewAppointmentPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminServicesPage } from './pages/admin/AdminServicesPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';

export const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/servicios" element={<ServicesListPage />} />
        <Route path="/servicios/:id" element={<ServiceDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/mis-turnos" element={<MyAppointmentsPage />} />
        <Route path="/mis-turnos/nuevo" element={<NewAppointmentPage />} />
        <Route path="/admin/servicios" element={<AdminServicesPage />} />
        <Route path="/admin/categorias" element={<AdminCategoriesPage />} />
        <Route path="/admin/turnos" element={<AdminAppointmentsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
