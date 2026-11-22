import { Route, Routes } from "react-router-dom";

import Layout from "./components/layout/Layout.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import StudentLayout from "./components/layout/StudentLayout.jsx";
import LandlordLayout from "./components/layout/LandlordLayout.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";

import HomePage from "./pages/public/HomePage.jsx";
import ListingsPage from "./pages/public/ListingsPage.jsx";
import ListingDetailPage from "./pages/public/ListingDetailPage.jsx";
import AboutPage from "./pages/public/AboutPage.jsx";
import SafetyPage from "./pages/public/SafetyPage.jsx";
import FaqPage from "./pages/public/FaqPage.jsx";
import ContactPage from "./pages/public/ContactPage.jsx";
import NotFoundPage from "./pages/public/NotFoundPage.jsx";

import LoginPage from "./pages/auth/LoginPage.jsx";
import SignupPage from "./pages/auth/SignupPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ProfilePage from "./pages/auth/ProfilePage.jsx";

import StudentDashboardPage from "./pages/student/StudentDashboardPage.jsx";
import FavoritesPage from "./pages/student/FavoritesPage.jsx";
import SavedSearchesPage from "./pages/student/SavedSearchesPage.jsx";
import StudentVisitsPage from "./pages/student/StudentVisitsPage.jsx";
import ChatsPage from "./pages/shared/ChatsPage.jsx";

import LandlordDashboardPage from "./pages/landlord/LandlordDashboardPage.jsx";
import LandlordListingsPage from "./pages/landlord/LandlordListingsPage.jsx";
import ListingFormPage from "./pages/landlord/ListingFormPage.jsx";
import LandlordVisitsPage from "./pages/landlord/LandlordVisitsPage.jsx";
import VerificationPage from "./pages/landlord/VerificationPage.jsx";

import AdminOverviewPage from "./pages/admin/AdminOverviewPage.jsx";
import VerificationQueuePage from "./pages/admin/VerificationQueuePage.jsx";
import FlaggedListingsPage from "./pages/admin/FlaggedListingsPage.jsx";
import UsersPage from "./pages/admin/UsersPage.jsx";
import AdminListingsPage from "./pages/admin/AdminListingsPage.jsx";
import AnalyticsPage from "./pages/admin/AnalyticsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="listings/:id" element={<ListingDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="safety" element={<SafetyPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="saved-searches" element={<SavedSearchesPage />} />
          <Route path="visits" element={<StudentVisitsPage />} />
          <Route path="chats" element={<ChatsPage base="/student/chats" title="Messages" />} />
          <Route path="chats/:chatId" element={<ChatsPage base="/student/chats" title="Messages" />} />
        </Route>

        <Route
          path="landlord"
          element={
            <ProtectedRoute allowedRoles={["landlord"]}>
              <LandlordLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<LandlordDashboardPage />} />
          <Route path="listings" element={<LandlordListingsPage />} />
          <Route path="listings/new" element={<ListingFormPage />} />
          <Route path="listings/:id/edit" element={<ListingFormPage />} />
          <Route path="visits" element={<LandlordVisitsPage />} />
          <Route path="chats" element={<ChatsPage base="/landlord/chats" title="Messages" />} />
          <Route path="chats/:chatId" element={<ChatsPage base="/landlord/chats" title="Messages" />} />
          <Route path="verification" element={<VerificationPage />} />
        </Route>

        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="verification" element={<VerificationQueuePage />} />
          <Route path="flagged" element={<FlaggedListingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="listings" element={<AdminListingsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
