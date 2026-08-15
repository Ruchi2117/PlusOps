import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { AuthGate } from "./auth-gate";
import { AppShell } from "./shell/app-shell";
import { LoadingState } from "../components/ui/data-state";

const LoginPage = lazy(() =>
  import("../features/auth/login-page").then((module) => ({ default: module.LoginPage }))
);
const DashboardPage = lazy(() =>
  import("../features/dashboard/dashboard-page").then((module) => ({
    default: module.DashboardPage
  }))
);
const IncidentsPage = lazy(() =>
  import("../features/incidents/incidents-page").then((module) => ({
    default: module.IncidentsPage
  }))
);
const IncidentDetailPage = lazy(() =>
  import("../features/incidents/incident-detail-page").then((module) => ({
    default: module.IncidentDetailPage
  }))
);
const ServicesPage = lazy(() =>
  import("../features/services/services-page").then((module) => ({ default: module.ServicesPage }))
);
const ServiceDetailPage = lazy(() =>
  import("../features/services/service-detail-page").then((module) => ({
    default: module.ServiceDetailPage
  }))
);
const HealthPage = lazy(() =>
  import("../features/observability/health-page").then((module) => ({ default: module.HealthPage }))
);
const MetricsPage = lazy(() =>
  import("../features/observability/metrics-page").then((module) => ({
    default: module.MetricsPage
  }))
);
const AlertsPage = lazy(() =>
  import("../features/observability/alerts-page").then((module) => ({ default: module.AlertsPage }))
);
const AICopilotPage = lazy(() =>
  import("../features/ai/ai-copilot-page").then((module) => ({ default: module.AICopilotPage }))
);
const ProfilePage = lazy(() =>
  import("../features/workspace/profile-page").then((module) => ({ default: module.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import("../features/workspace/settings-page").then((module) => ({ default: module.SettingsPage }))
);
const NotificationsPage = lazy(() =>
  import("../features/workspace/notifications-page").then((module) => ({
    default: module.NotificationsPage
  }))
);
const VisualFoundationPage = lazy(() =>
  import("../features/foundation/visual-foundation-page").then((module) => ({
    default: module.VisualFoundationPage
  }))
);

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: withSuspense(<LoginPage />)
  },
  {
    path: "/",
    element: (
      <AuthGate>
        <AppShell />
      </AuthGate>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: withSuspense(<DashboardPage />)
      },
      {
        path: "incidents",
        element: withSuspense(<IncidentsPage />)
      },
      {
        path: "incidents/:incidentId",
        element: withSuspense(<IncidentDetailPage />)
      },
      {
        path: "services",
        element: withSuspense(<ServicesPage />)
      },
      {
        path: "services/:serviceId",
        element: withSuspense(<ServiceDetailPage />)
      },
      {
        path: "health",
        element: withSuspense(<HealthPage />)
      },
      {
        path: "metrics",
        element: withSuspense(<MetricsPage />)
      },
      {
        path: "alerts",
        element: withSuspense(<AlertsPage />)
      },
      {
        path: "ai",
        element: withSuspense(<AICopilotPage />)
      },
      {
        path: "copilot",
        element: <Navigate to="/ai" replace />
      },
      {
        path: "monitoring",
        element: <Navigate to="/health" replace />
      },
      {
        path: "profile",
        element: withSuspense(<ProfilePage />)
      },
      {
        path: "settings",
        element: withSuspense(<SettingsPage />)
      },
      {
        path: "notifications",
        element: withSuspense(<NotificationsPage />)
      },
      {
        path: "_dev/visual-foundation",
        element: withSuspense(<VisualFoundationPage />)
      }
    ]
  }
]);
