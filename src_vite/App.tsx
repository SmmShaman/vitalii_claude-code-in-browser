import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { TranslationProvider } from './contexts/TranslationContext';
import { Index } from './pages/Index';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TranslationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/news/:slug" element={<NewsDetailPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TranslationProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
