import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { ThemeProvider } from '@context/ThemeContext';
import { DashboardLayout } from '@components/layout/DashboardLayout';
import { ProtectedRoute } from '@components/ui/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { SignupPage, NotFoundPage, DashboardPage, AccountPage } from '@pages/index';
import { AdminLogin }      from '@/pages/auth/AdminLogin';
import { UserLogin }       from '@/pages/auth/UserLogin';
import { UserRegister }    from '@/pages/auth/UserRegister';
import { AdminDashboard }  from '@/pages/dashboard/AdminDashboard';
import { UserDashboard }   from '@/pages/dashboard/UserDashboard';
import { UpaUsersPage }    from '@/pages/dashboard/UpaUsersPage';
import { UPATreePage }     from '@/pages/dashboard/admin/UPATreePage';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* User auth */}
      <Route path="/login"    element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />

      {/* Legacy guest routes */}
      <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

      {/* Admin dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* UPA Users page */}
      <Route
        path="/admin/upa-users"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <UpaUsersPage />
          </ProtectedRoute>
        }
      />
      {/* UPA Tree page */}
      <Route
        path="/admin/upa-tree"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin']}>
            <UPATreePage />
          </ProtectedRoute>
        }
      />

      <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

      {/* User dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['upa_user']}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* Legacy protected dashboard */}
      <Route
        path="/dashboard/legacy"
        element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<DashboardPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
