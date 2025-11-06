
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import EditProduct from "./pages/EditProduct";
// import Groups from "./pages/Groups"; // DISABLED: Groups page removed - groups are now exclusively private
import GroupDetail from "./pages/GroupDetail";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";
import SearchUs from "./pages/SearchUs";
import Dashboard from "./pages/DashBoard";
import VendorOrders from "./pages/VendorOrders";

const queryClient = new QueryClient();

// Redirect component for old routes
const ProfileRedirect = () => {
  const { user } = useAuth();
  // return <Navigate to={user ? `/users/${user.id}` : '/auth'} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/search" element={<SearchUs />} />
              {/* <Route path="/feed" element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
            } /> */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/products/:productId/edit" element={
                <ProtectedRoute>
                  <EditProduct />
                </ProtectedRoute>
              } />
              {/* DISABLED: Groups routes removed - groups are now exclusively private
              <Route path="/groups" element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              } />
              <Route path="/groups/:groupId" element={
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              } />
              */}
              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/wishlist" element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/orders/:orderId" element={
                <ProtectedRoute>
                  <OrderConfirmation />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/users/:userId" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              <Route path="/groups/:groupId" element={
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/vendor/orders" element={
                <ProtectedRoute>
                  <VendorOrders />
                </ProtectedRoute>
              } />
              {/* Redirect old routes to user profile */}
              {/* <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfileRedirect />
                </ProtectedRoute>
              } /> */}
              {/* <Route path="/dashboard" element={
                <ProtectedRoute requireAuth={true}>
                  <Dashboard />
                </ProtectedRoute>
              } /> */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
