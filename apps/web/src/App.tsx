import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { AdminLayout } from "./components/layout/AdminLayout";
import { ShellOverlays } from "./components/layout/ShellOverlays";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { Spinner } from "./components/ui/Spinner";
import { ToastProvider } from "./components/ui/ToastProvider";
import { CalendarPage } from "./pages/CalendarPage";
import { BacklogItemDetailPage } from "./pages/BacklogItemDetailPage";
import { DayPlanPage } from "./pages/DayPlanPage";
import { FeatureDetailPage } from "./pages/FeatureDetailPage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { LoginPage } from "./pages/LoginPage";
import { JournalPage } from "./pages/JournalPage";
import { MilestoneDetailPage } from "./pages/MilestoneDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { MilestonesPage } from "./pages/MilestonesPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SetupPasswordPage } from "./pages/SetupPasswordPage";
import { AttachmentSyncPage } from "./pages/admin/AttachmentSyncPage";
import { SettingsCatalogsPage } from "./pages/SettingsCatalogsPage";
import { SettingsPreferencesPage } from "./pages/SettingsPreferencesPage";
import { SettingsTagsPage } from "./pages/SettingsTagsPage";
import { StartPage } from "./pages/StartPage";
import { TasksPage } from "./pages/TasksPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { UseCaseDetailPage } from "./pages/UseCaseDetailPage";
import { WikiPage } from "./pages/WikiPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { UISettingsPage } from "./pages/admin/UISettingsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { useAuth } from "./hooks/useAuth";
import { hasPermission } from "./hooks/usePermissions";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { SettingsProvider } from "./providers/SettingsProvider";
import { isStandaloneSearch } from "./utils/standalone";

function hasAdminAccess(user: ReturnType<typeof useAuth>["user"]): boolean {
  return Boolean(user?.permissions.some((permission) => (permission.resource === "*" || permission.resource === "users" || permission.resource === "roles") && (permission.action === "*" || permission.action === "admin")));
}

function isFullBleedRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    /^\/(?:projects|milestones|tasks|tickets|features|use-cases|backlog|notes)(?:\/|$)/.test(pathname) ||
    /^\/(?:wiki|calendar|day-plan|journal)(?:\/|$)/.test(pathname) ||
    /^\/settings\/preferences\/?$/.test(pathname) ||
    /^\/admin(?:\/|$)/.test(pathname)
  );
}

const heroLayoutStyle = { "--hero-h": "128px" } as CSSProperties;

export default function App() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useRealtimeSync(Boolean(auth.user && !auth.requiresPasswordSetup && hasPermission(auth.user, "realtime", "read")));

  if (auth.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-shell text-ink">
        <Spinner />
      </main>
    );
  }

  if (!auth.user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  if (auth.requiresPasswordSetup && location.pathname !== "/setup-password") {
    return <Navigate to="/setup-password" replace />;
  }

  if (auth.requiresPasswordSetup) {
    return (
      <Routes>
        <Route path="/setup-password" element={<SetupPasswordPage />} />
        <Route path="*" element={<Navigate to="/setup-password" replace />} />
      </Routes>
    );
  }

  const adminAccess = hasAdminAccess(auth.user);
  const dashboardAccess = hasPermission(auth.user, "dashboards", "read");
  const dayPlanAccess = hasPermission(auth.user, "dayPlans", "read");
  const fullBleedRoute = isFullBleedRoute(location.pathname);
  const standaloneView = isStandaloneSearch(location.search);
  const mainClass = `flex min-h-0 min-w-0 flex-1 flex-col ${fullBleedRoute ? "overflow-hidden p-0" : "overflow-auto p-4 md:p-6"}`;
  const routes = (
    <Routes>
      <Route path="/" element={dashboardAccess ? <StartPage /> : <ForbiddenPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/new" element={<ProjectDetailPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/milestones" element={<MilestonesPage />} />
      <Route path="/milestones/new" element={<MilestoneDetailPage />} />
      <Route path="/milestones/:id" element={<MilestoneDetailPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/tasks/new" element={<TaskDetailPage />} />
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
      <Route path="/tickets" element={<TicketsPage />} />
      <Route path="/tickets/new" element={<TicketDetailPage />} />
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/features/new" element={<FeatureDetailPage />} />
      <Route path="/features/:id" element={<FeatureDetailPage />} />
      <Route path="/use-cases/new" element={<UseCaseDetailPage />} />
      <Route path="/use-cases/:id" element={<UseCaseDetailPage />} />
      <Route path="/backlog/new" element={<BacklogItemDetailPage />} />
      <Route path="/backlog/:id" element={<BacklogItemDetailPage />} />
      <Route path="/notes/:id" element={<NoteDetailPage />} />
      <Route path="/wiki" element={<WikiPage />} />
      <Route path="/wiki/:id" element={<WikiPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/day-plan" element={dayPlanAccess ? <DayPlanPage /> : <ForbiddenPage />} />
      <Route path="/journal" element={<JournalPage />} />
      <Route path="/settings/preferences" element={<SettingsPreferencesPage />} />
      <Route path="/settings/catalogs" element={adminAccess ? <Navigate to="/admin/catalogs" replace /> : <ForbiddenPage />} />
      <Route path="/settings/tags" element={adminAccess ? <Navigate to="/admin/tags" replace /> : <ForbiddenPage />} />
      <Route path="/settings/backup" element={adminAccess ? <Navigate to="/admin/sync" replace /> : <ForbiddenPage />} />
      <Route path="/admin" element={adminAccess ? <Navigate to="/admin/catalogs" replace /> : <ForbiddenPage />} />
      <Route path="/admin/catalogs" element={adminAccess ? <AdminLayout><SettingsCatalogsPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/tags" element={adminAccess ? <AdminLayout><SettingsTagsPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/sync" element={adminAccess ? <AdminLayout><AttachmentSyncPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/users" element={adminAccess ? <AdminLayout><UsersPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/users/new" element={adminAccess ? <Navigate to="/admin/users" replace /> : <ForbiddenPage />} />
      <Route path="/admin/users/:id" element={adminAccess ? <Navigate to="/admin/users" replace /> : <ForbiddenPage />} />
      <Route path="/admin/roles" element={adminAccess ? <AdminLayout><RolesPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/ui" element={adminAccess ? <AdminLayout><UISettingsPage /></AdminLayout> : <ForbiddenPage />} />
      <Route path="/admin/roles/new" element={adminAccess ? <Navigate to="/admin/roles" replace /> : <ForbiddenPage />} />
      <Route path="/admin/roles/:id" element={adminAccess ? <Navigate to="/admin/roles" replace /> : <ForbiddenPage />} />
      <Route path="/setup-password" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  if (standaloneView) {
    return (
      <SettingsProvider>
        <ToastProvider>
          <main className={`h-screen bg-shell text-ink ${mainClass}`} style={heroLayoutStyle}>
            {routes}
          </main>
        </ToastProvider>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-shell text-ink" style={heroLayoutStyle}>
          <Sidebar
            currentUser={auth.user}
            onLogout={() => {
              void auth.logout().then(() => navigate("/login", { replace: true }));
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar />
            <ShellOverlays />
            <main className={mainClass}>
              {routes}
            </main>
          </div>
        </div>
      </ToastProvider>
    </SettingsProvider>
  );
}
