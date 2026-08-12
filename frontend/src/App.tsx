import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CourseFormPage from "./pages/CourseFormPage";
import LessonPage from "./pages/LessonPage";
import LessonFormPage from "./pages/LessonFormPage";
import PricingPage from "./pages/PricingPage";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:id" element={<CourseDetailPage />} />
                <Route path="/courses/:id/lessons/:lessonId" element={<LessonPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/courses/new" element={<CourseFormPage />} />
                  <Route path="/courses/:id/edit" element={<CourseFormPage />} />
                  <Route path="/courses/:id/lessons/new" element={<LessonFormPage />} />
                  <Route path="/courses/:id/lessons/:lessonId/edit" element={<LessonFormPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
