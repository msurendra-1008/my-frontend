import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { ThemeProvider } from '@context/ThemeContext';
import { DashboardLayout } from '@components/layout/DashboardLayout';
import { ProtectedRoute } from '@components/ui/ProtectedRoute';
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
import { AdminProcurementPage }    from '@/pages/dashboard/admin/ProcurementPage';
import { AdminInspectionPage }    from '@/pages/dashboard/admin/InspectionPage';
import { InspectionDetailPage }   from '@/pages/dashboard/admin/InspectionDetail';
import { AdminWarehousePage }     from '@/pages/dashboard/admin/WarehousePage';
import { AdminStockPage }         from '@/pages/dashboard/admin/StockPage';
import { TenderPage }             from '@/pages/dashboard/admin/TenderPage';
import { TenderDetail }           from '@/pages/dashboard/admin/TenderDetail';
import { CommissionSettingsPage } from '@/pages/dashboard/admin/CommissionSettingsPage';
import { PendingCommissionsPage } from '@/pages/dashboard/admin/PendingCommissionsPage';
import CompanyWalletPage          from '@/pages/dashboard/admin/CompanyWalletPage';
import { ProductPricingPage }     from '@/pages/dashboard/admin/ProductPricingPage';
import { BillingPage }           from '@/pages/dashboard/admin/BillingPage';
import { BillReturnPage }        from '@/pages/dashboard/admin/BillReturnPage';
import { BillHistoryPage }       from '@/pages/dashboard/admin/BillHistoryPage';
import { DiscountCodesPage }     from '@/pages/dashboard/admin/DiscountCodesPage';
import { PayrollEmployeesPage }    from '@/pages/dashboard/admin/PayrollEmployeesPage';
import { PayrollPage }             from '@/pages/dashboard/admin/PayrollPage';
import { AttendancePage }          from '@/pages/dashboard/admin/AttendancePage';
import { DeliverySettingsPage }    from '@/pages/dashboard/admin/DeliverySettingsPage';
import { DeliveryAssignPage }      from '@/pages/dashboard/admin/DeliveryAssignPage';
import { DeliveryTrackingPage }    from '@/pages/dashboard/admin/DeliveryTrackingPage';
import { DeliveryPartnerDashboard } from '@/pages/delivery/DeliveryPartnerDashboard';
import { VendorLogin }        from '@/pages/vendor/VendorLogin';
import { VendorRegister }     from '@/pages/vendor/VendorRegister';
import { VendorDashboard }    from '@/pages/vendor/VendorDashboard';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
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
      <Route
        path="/admin/upa-users"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <UpaUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/upa-tree"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin']}>
            <UPATreePage />
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminReturnsPage />
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/admin/procurement"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminProcurementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inspection"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminInspectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inspection/:id"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <InspectionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/warehouse"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminWarehousePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stock"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <AdminStockPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tender"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <TenderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tender/:id"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <TenderDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commissions/settings"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <CommissionSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/commissions/pending"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PendingCommissionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/company-wallet"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <CompanyWalletPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/product-pricing"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <ProductPricingPage />
          </ProtectedRoute>
        }
      />

      {/* Billing routes */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/return"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <BillReturnPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/history"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin','employee']}>
            <BillHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/discount-codes"
        element={
          <ProtectedRoute allowedRoles={['superadmin','admin']}>
            <DiscountCodesPage />
          </ProtectedRoute>
        }
      />

      {/* Delivery admin routes */}
      <Route
        path="/admin/delivery/settings"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <DeliverySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/delivery/assign"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <DeliveryAssignPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/delivery/tracking"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <DeliveryTrackingPage />
          </ProtectedRoute>
        }
      />

      {/* Delivery partner dashboard */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['delivery_partner']}>
            <DeliveryPartnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* HR routes */}
      <Route
        path="/admin/hr/employees"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PayrollEmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hr/payroll"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hr/attendance"
        element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AttendancePage />
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
