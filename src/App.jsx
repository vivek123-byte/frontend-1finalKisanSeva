import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectRoute from "./components/auth/ProtectRoute";
import { LayoutLoader } from "./components/layout/Loaders";
import axios from "axios";
import { server } from "./constants/config";
import { useDispatch, useSelector } from "react-redux";
import { userExists, userNotExists } from "./redux/reducers/auth";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./socket";

// Lazy-loaded components
const LandingHome = lazy(() => import("./components/LandingPage/Home"));
const ChatHome = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Chat = lazy(() => import("./pages/Chat"));
const Groups = lazy(() => import("./pages/Groups"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ChatManagement = lazy(() => import("./pages/admin/ChatManagement"));
const MarketG = lazy(() => import("./components/LandingPage/MarketG"));
const MessagesManagement = lazy(() =>
  import("./pages/admin/MessageManagement")
);
const FarmerDashboard = lazy(() =>
  import("./components/farmerDashBoard/farmerDashboard")
);
const BuyerDashboard = lazy(() =>
  import("./components/buyerDashBoard/buyerDashBoard")
);
const ContractForm = lazy(() =>
  import("./components/make-contract/ContractForm")
);
const FarmerReview = lazy(() =>
  import("./components/make-contract/FarmerReview")
);
const ContractFinal = lazy(() =>
  import("./components/make-contract/ContractFinal")
);
const CPayment = lazy(() => import("./components/payment/cpayment"));
const UserRoleModal = lazy(() => import("./components/modal/modal"));

const App = () => {
  const { user, loader } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Trigger modal after login or signup
  const handleAuthSuccess = () => {
    setShowRoleModal(true);
  };

  useEffect(() => {
    axios
      .get(`${server}/api/v1/user/me`, { withCredentials: true })
      .then(({ data }) => dispatch(userExists(data.user)))
      .catch((err) => dispatch(userNotExists()));
  }, [dispatch]);

  return loader ? (
    <LayoutLoader />
  ) : (
    <BrowserRouter>
      <Suspense fallback={<LayoutLoader />}>
        {/* Render UserRoleModal globally */}
        <UserRoleModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
        />
        <Routes>
          {/* Public homepage accessible to all */}
          <Route path="/" element={<LandingHome />} />

          {/* Protected routes for authenticated users */}
          <Route
            element={
              <SocketProvider>
                <ProtectRoute user={user} redirect="/login" />
              </SocketProvider>
            }
          >
            <Route path="/chat-home" element={<ChatHome />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
            <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
            <Route path="/contract-form" element={<ContractForm />} />
            <Route path="/farmer-review" element={<FarmerReview />} />
            <Route path="/contract-final" element={<ContractFinal />} />
            <Route path="/contract-payment" element={<CPayment />} />
            <Route path="/general-market" element={<MarketG />} />
          </Route>

          {/* Auth routes */}
          <Route
            path="/login"
            element={
              <ProtectRoute user={!user}>
                <Login onAuthSuccess={handleAuthSuccess} />
              </ProtectRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <ProtectRoute user={!user}>
                <Login onAuthSuccess={handleAuthSuccess} />
              </ProtectRoute>
            }
          />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/chats" element={<ChatManagement />} />
          <Route path="/admin/messages" element={<MessagesManagement />} />

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="bottom-center" />
    </BrowserRouter>
  );
};

export default App;
