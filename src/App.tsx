import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage, HomePage, TeamPage, ProjectPage, JourneyPage } from './pages';
import { ProtectedRoute } from './components/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:teamSlug/dashboard"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:teamSlug/project/:projectId"
          element={
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:teamSlug/project/:projectId/journey/:journeyId"
          element={
            <ProtectedRoute>
              <JourneyPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
