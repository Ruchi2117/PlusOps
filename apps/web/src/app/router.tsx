import { createBrowserRouter, Navigate } from "react-router";

import { AppShell } from "./shell/app-shell";
import { DashboardPage } from "../features/dashboard/dashboard-page";
import { ModulePlaceholderPage } from "../features/foundation/module-placeholder-page";
import { IncidentsPage } from "../features/incidents/incidents-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <DashboardPage />
      },
      {
        path: "incidents",
        element: <IncidentsPage />
      },
      {
        path: "services",
        element: (
          <ModulePlaceholderPage
            title="Services"
            emptyTitle="No services registered"
            primaryAction="Register service"
          />
        )
      },
      {
        path: "apis",
        element: (
          <ModulePlaceholderPage
            title="APIs"
            emptyTitle="No API collections"
            primaryAction="Create collection"
          />
        )
      },
      {
        path: "monitoring",
        element: (
          <ModulePlaceholderPage
            title="Monitoring"
            emptyTitle="No monitors connected"
            primaryAction="Connect monitor"
          />
        )
      },
      {
        path: "copilot",
        element: (
          <ModulePlaceholderPage
            title="AI Copilot"
            emptyTitle="No AI workflows configured"
            primaryAction="Create workflow"
          />
        )
      },
      {
        path: "teams",
        element: (
          <ModulePlaceholderPage
            title="Teams"
            emptyTitle="No teams invited"
            primaryAction="Invite team"
          />
        )
      },
      {
        path: "security",
        element: (
          <ModulePlaceholderPage
            title="Security"
            emptyTitle="No security policies configured"
            primaryAction="Add policy"
          />
        )
      }
    ]
  }
]);
