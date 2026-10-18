import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatDashboard } from './pages/ChatDashboard';
import { DashboardSkeleton, AuthCardSkeleton } from './components/common/Skeleton';
import { PulseLogo } from './components/common/PulseLogo';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { ActiveCallModal } from './components/call/ActiveCallModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Protected Route wrapper with Dashboard Skeleton loader
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route (redirects to original target or /chat if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthCardSkeleton />;
  }

  if (isAuthenticated) {
    const search = location.search || '';
    let target = `/chat${search}`;
    if (location.state?.from) {
      if (typeof location.state.from === 'string') {
        target = location.state.from;
      } else if (location.state.from?.pathname) {
        target = `${location.state.from.pathname}${location.state.from.search || ''}`;
      }
    }
    // Never redirect to landing, login, register, or undefined paths
    if (target === '/' || target.startsWith('/login') || target.startsWith('/register') || target.includes('undefined')) {
      target = `/chat${search}`;
    }
    return <Navigate to={target} replace />;
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
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ChatProvider>
              <CallProvider>
                <BrowserRouter>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <PublicRoute>
                          <LandingPage />
                        </PublicRoute>
                      }
                    />
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
                      path="/join/:code"
                      element={
                        <ProtectedRoute>
                          <JoinGroupHandler />
                        </ProtectedRoute>
                      }
                    />
                    {/* Fallback to Home / Chat with replace */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>

                  {/* WebRTC Audio/Video Call Modals */}
                  <IncomingCallModal />
                  <ActiveCallModal />
                </BrowserRouter>
              </CallProvider>
            </ChatProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
