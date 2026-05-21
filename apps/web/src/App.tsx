import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { Spinner } from "./components/ui/Spinner";
import { CalendarPage } from "./pages/CalendarPage";
import { BacklogItemDetailPage } from "./pages/BacklogItemDetailPage";
import { FeatureDetailPage } from "./pages/FeatureDetailPage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { LoginPage } from "./pages/LoginPage";
import { JournalPage } from "./pages/JournalPage";
import { MilestoneDetailPage } from "./pages/MilestoneDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SetupPasswordPage } from "./pages/SetupPasswordPage";
import { SettingsBackupPage } from "./pages/SettingsBackupPage";
import { SettingsCatalogsPage } from "./pages/SettingsCatalogsPage";
import { SettingsPreferencesPage } from "./pages/SettingsPreferencesPage";
import { SettingsTagsPage } from "./pages/SettingsTagsPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { UseCaseDetailPage } from "./pages/UseCaseDetailPage";
import { WikiPage } from "./pages/WikiPage";
import { RoleDetailPage } from "./pages/admin/RoleDetailPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { UserDetailPage } from "./pages/admin/UserDetailPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { useAuth } from "./hooks/useAuth";
import { hasPermission } from "./hooks/usePermissions";
import { SettingsProvider } from "./providers/SettingsProvider";

function hasAdminAccess(user: ReturnType<typeof useAuth>["user"]): boolean {
  return Boolean(user?.permissions.some((permission) => (permission.resource === "*" || permission.resource === "users" || permission.resource === "roles") && (permission.action === "*" || permission.action === "admin")));
}

function isFullBleedDetailRoute(pathname: string): boolean {
  return /^\/(?:projects|milestones|tickets|tasks|features|use-cases|backlog)\/(?:new|\d+)\/?$/.test(pathname);
}

export default function App() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
  const backupAccess = hasPermission(auth.user, "dumps", "read");
  const fullBleedDetailRoute = isFullBleedDetailRoute(location.pathname);

  return (
    <SettingsProvider>
      <div className="flex h-screen overflow-hidden bg-shell text-ink">
        <Sidebar
          currentUser={auth.user}
          onLogout={() => {
            void auth.logout().then(() => navigate("/login", { replace: true }));
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className={`flex min-h-0 min-w-0 flex-1 flex-col ${fullBleedDetailRoute ? "overflow-hidden p-0" : "overflow-auto p-4 md:p-6"}`}>
            <Routes>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<ProjectDetailPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/milestones/new" element={<MilestoneDetailPage />} />
              <Route path="/milestones/:id" element={<MilestoneDetailPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/new" element={<TicketDetailPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/tasks/new" element={<TaskDetailPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/features/new" element={<FeatureDetailPage />} />
              <Route path="/features/:id" element={<FeatureDetailPage />} />
              <Route path="/use-cases/new" element={<UseCaseDetailPage />} />
              <Route path="/use-cases/:id" element={<UseCaseDetailPage />} />
              <Route path="/backlog/new" element={<BacklogItemDetailPage />} />
              <Route path="/backlog/:id" element={<BacklogItemDetailPage />} />
              <Route path="/wiki" element={<WikiPage />} />
              <Route path="/wiki/:id" element={<WikiPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/settings/preferences" element={<SettingsPreferencesPage />} />
              <Route path="/settings/catalogs" element={<SettingsCatalogsPage />} />
              <Route path="/settings/tags" element={<SettingsTagsPage />} />
              <Route path="/settings/backup" element={backupAccess ? <SettingsBackupPage /> : <ForbiddenPage />} />
              <Route path="/admin/users" element={adminAccess ? <UsersPage /> : <ForbiddenPage />} />
              <Route path="/admin/users/new" element={adminAccess ? <UserDetailPage /> : <ForbiddenPage />} />
              <Route path="/admin/users/:id" element={adminAccess ? <UserDetailPage /> : <ForbiddenPage />} />
              <Route path="/admin/roles" element={adminAccess ? <RolesPage /> : <ForbiddenPage />} />
              <Route path="/admin/roles/new" element={adminAccess ? <RoleDetailPage /> : <ForbiddenPage />} />
              <Route path="/admin/roles/:id" element={adminAccess ? <RoleDetailPage /> : <ForbiddenPage />} />
              <Route path="/setup-password" element={<Navigate to="/projects" replace />} />
              <Route path="/login" element={<Navigate to="/projects" replace />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
