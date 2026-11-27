import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { StatusProvider } from './context/StatusContext';
import { StoryRingProvider } from './context/StoryRingContext';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatDashboard } from './pages/ChatDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AccountRecoveryPage } from './pages/AccountRecoveryPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ConfirmDeletionPage } from './pages/ConfirmDeletionPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DeletionAppealPage } from './pages/DeletionAppealPage';
import { DashboardSkeleton, AuthCardSkeleton, AdminDashboardSkeleton } from './components/common/Skeleton';
import { PulseLogo } from './components/common/PulseLogo';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { ActiveCallModal } from './components/call/ActiveCallModal';
import { IncomingCodeModal } from './components/common/IncomingCodeModal';
import { MaintenanceBanner } from './components/common/MaintenanceBanner';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { CyberSplitscreenLoader } from './components/common/CyberSplitscreenLoader';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Protected Route wrapper — unauthenticated users go to landing (replace so /chat never sits in history for guests)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    // replace: true so back-button from landing never loops back through /chat
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Route wrapper
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

// Smart Home Route — authenticated users are forwarded to /chat so "/" never sits
// in their browser history as a "back" destination while they're logged in.
const HomeRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthCardSkeleton />;
  }

  // replace: true means /chat replaces / in history → back from chat exits the app,
  // not loops back to landing while still logged in.
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

// Public Route (redirects authenticated users to /chat — covers /login & /register)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthCardSkeleton />;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

// Handle joining group invite link with smooth status feedback
const JoinGroupHandler = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { authHeaders, fetchConversations } = useChat();
  const [statusText, setStatusText] = useState('Verifying invitation link...');

  useEffect(() => {
    let active = true;
    const join = async () => {
      try {
        setStatusText('Joining encrypted group...');
        const res = await fetch(`/api/groups/join/${encodeURIComponent(code)}`, {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include'
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && active) {
            await fetchConversations();
          }
        }
      } catch (err) {
        console.error('Failed to join via invite link', err);
      } finally {
        if (active) {
          navigate('/chat', { replace: true });
        }
      }
    };

    join();
    return () => {
      active = false;
    };
  }, [code, authHeaders, fetchConversations, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 px-4 text-center">
      <PulseLogo size="md" animated={true} />
      <div className="flex items-center space-x-2 text-slate-300 text-xs font-mono">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>{statusText}</span>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <StoryRingProvider>
            <ThemeProvider>
              <FeatureFlagsProvider>
                <MaintenanceProvider>
                  <ChatProvider>
                    <CallProvider>
                      <BrowserRouter>
                        <StatusProvider>
                        <MaintenanceBanner />
                        <Routes>
                          {/* Landing — smart home: logged-in users go straight to /chat (replace keeps history clean) */}
                          <Route path="/" element={<HomeRoute><LandingPage /></HomeRoute>} />
                          <Route path="/landing" element={<HomeRoute><LandingPage /></HomeRoute>} />
                          <Route
                            path="/login"
                            element={
                              <PublicRoute>
                                <LoginPage />
                              </PublicRoute>
                            }
                          />
                          <Route
                            path="/register"
                            element={
                              <PublicRoute>
                                <RegisterPage />
                              </PublicRoute>
                            }
                          />
                          <Route
                            path="/chat"
                            element={
                              <ProtectedRoute>
                                <ChatDashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin"
                            element={
                              <AdminRoute>
                                <AdminDashboard />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/join/:code"
                            element={
                              <ProtectedRoute>
                                <JoinGroupHandler />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/account-recovery"
                            element={<AccountRecoveryPage />}
                          />
                          <Route
                            path="/verify-email"
                            element={<VerifyEmailPage />}
                          />
                          <Route
                            path="/confirm-deletion"
                            element={<ConfirmDeletionPage />}
                          />
                          <Route
                            path="/reset-password"
                            element={<ResetPasswordPage />}
                          />
                          <Route
                            path="/deletion-appeal"
                            element={<DeletionAppealPage />}
                          />
                          {/* Fallback to Home / Chat with replace */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>

                        {/* WebRTC Audio/Video Call Modals */}
                        <IncomingCallModal />
                        <ActiveCallModal />

                        {/* Manual Admin Verification Code Delivery Modal */}
                        <IncomingCodeModal />

                        {/* Full-System Scheduled Maintenance Overlay */}
                        <MaintenanceScreen />

                        {/* Sci-Fi 01 Green Data Cloud Split-Screen Intro Animation */}
                        <CyberSplitscreenLoader />
                      </StatusProvider>
                    </BrowserRouter>
                  </CallProvider>
                </ChatProvider>
              </MaintenanceProvider>
            </FeatureFlagsProvider>
          </ThemeProvider>
        </StoryRingProvider>
      </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
