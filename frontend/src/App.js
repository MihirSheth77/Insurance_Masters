import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AppProvider } from './context/AppContext';
import { GroupProvider } from './context/GroupContext';
import { MemberProvider } from './context/MemberContext';
import { QuoteProvider } from './context/QuoteContext';

// Common Components
import ErrorBoundary from './components/common/ErrorBoundary';

// Navigation Components
import Navigation from './components/Navigation/Navigation';
import TopBar from './components/Navigation/TopBar';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Groups from './pages/Groups/Groups';
import GroupDetail from './pages/GroupDetail/GroupDetail';
import GroupSetupPage from './pages/GroupSetup/GroupSetupPage';
import ClassManagementPage from './pages/ClassManagement/ClassManagementPage';
import MemberManagementPage from './pages/MemberManagement/MemberManagementPage';
import QuoteResultsPage from './pages/QuoteResults/QuoteResultsPage';
import DataManagement from './pages/DataManagement/DataManagement';
import WorkflowPage from './pages/Workflow/WorkflowPage';


// Styles
import './styles/index.css';

// API Service
import { apiService } from './services/api';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return error?.response?.status === 429 && failureCount < 3;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return error?.response?.status === 429 && failureCount < 2;
        }
        return failureCount < 2;
      },
    },
  },
});

function App() {
  // Test backend connection on app load
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        await apiService.checkHealth();
      } catch (error) {
        // Silently handle connection errors on startup
      }
    };

    testBackendConnection();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
        <GroupProvider>
          <MemberProvider>
            <QuoteProvider>
              <Router>
                <div className="App with-sidebar">
                  <Navigation />
                  <TopBar />
                  <main className="main-content with-topbar">
                    <Routes>
                      {/* Default redirect to dashboard */}
                      <Route path="/" element={<Dashboard />} />
                      
                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      
                      {/* Workflow - 4-Step Process as per requirements */}
                      <Route path="/workflow" element={<Navigate to="/workflow/group-setup" replace />} />
                      <Route path="/workflow/:step" element={<WorkflowPage />} />
                      
                      {/* Simple Quote Page */}
                      <Route path="/quote/new" element={<QuoteResultsPage />} />
                      
                      {/* Quote Selection Modal Routes */}
                      <Route path="/quote/select-group" element={<Groups selectMode={true} />} />
                      <Route path="/quotes/history" element={<QuoteResultsPage />} />
                      
                      {/* Groups Management */}
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/groups/:groupId" element={<GroupDetail />} />
                      <Route path="/groups/:groupId/edit" element={<GroupSetupPage editMode={true} />} />
                      <Route path="/groups/:groupId/classes" element={<ClassManagementPage />} />
                      <Route path="/groups/:groupId/members" element={<MemberManagementPage />} />
                      
                      {/* Individual Pages (kept for direct access) */}
                      <Route path="/group-setup" element={<GroupSetupPage />} />
                      <Route path="/group-setup/:step" element={<GroupSetupPage />} />
                      
                      {/* Class Management */}
                      <Route path="/classes" element={<ClassManagementPage />} />
                      
                      {/* Member Management */}
                      <Route path="/members" element={<MemberManagementPage />} />
                      <Route path="/members/add" element={<MemberManagementPage />} />
                      <Route path="/members/upload" element={<MemberManagementPage />} />
                      
                      {/* Quote Management */}
                      <Route path="/quotes" element={<QuoteResultsPage />} />
                      <Route path="/quotes/generate" element={<QuoteResultsPage />} />
                      
                      {/* Data Management */}
                      <Route path="/data-management" element={<DataManagement />} />
                      
                      {/* Catch all route - redirect to dashboard */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </Router>
              
              {/* React Query DevTools - only in development */}
              {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
              
              {/* Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </QuoteProvider>
          </MemberProvider>
        </GroupProvider>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;