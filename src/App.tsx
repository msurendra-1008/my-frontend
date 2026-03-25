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
import { ProductsPage }       from '@/pages/dashboard/admin/ProductsPage';
import { ProductDetailPage } from '@/pages/dashboard/admin/ProductDetailPage';
import { StoreFront }         from '@/pages/shop/StoreFront';
import { ProductDetail }      from '@/pages/shop/ProductDetail';
import { CheckoutPage }       from '@/pages/checkout/CheckoutPage';
import { OrderSuccessPage }   from '@/pages/checkout/OrderSuccessPage';
import { CartPage }           from '@/pages/cart/CartPage';
import { AdminOrdersPage }    from '@/pages/dashboard/admin/OrdersPage';
import { AdminReturnsPage }   from '@/pages/dashboard/admin/ReturnsPage';
import { AdminVendorsPage }        from '@/pages/dashboard/admin/VendorsPage';
import { AdminVendorProductsPage } from '@/pages/dashboard/admin/VendorProductsPage';
import { VendorLogin }        from '@/pages/vendor/VendorLogin';
import { VendorRegister }     from '@/pages/vendor/VendorRegister';
import { VendorDashboard }    from '@/pages/vendor/VendorDashboard';

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

      {/* Admin products */}
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/:slug"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <ProductDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Admin orders */}
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminOrdersPage />
          </ProtectedRoute>
        }
      />

      {/* Admin returns */}
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminReturnsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin vendors */}
      <Route
        path="/admin/vendors"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminVendorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendor-products"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminVendorProductsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Vendor portal */}
      <Route path="/vendor/login"    element={<VendorLogin />} />
      <Route path="/vendor/register" element={<VendorRegister />} />
      <Route
        path="/vendor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Public shop */}
      <Route path="/shop"       element={<StoreFront />} />
      <Route path="/shop/:slug" element={<ProductDetail />} />

      {/* Cart (UPA users only) */}
      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={['upa_user']}>
            <CartPage />
          </ProtectedRoute>
        }
      />

      {/* Checkout (UPA users only) */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={['upa_user']}>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/success"
        element={
          <ProtectedRoute allowedRoles={['upa_user']}>
            <OrderSuccessPage />
          </ProtectedRoute>
        }
      />

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
