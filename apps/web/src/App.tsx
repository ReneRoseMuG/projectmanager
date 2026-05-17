import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { CalendarPage } from "./pages/CalendarPage";
import { FeatureDetailPage } from "./pages/FeatureDetailPage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsBackupPage } from "./pages/SettingsBackupPage";
import { SettingsSeedDataPage } from "./pages/SettingsSeedDataPage";
import { SettingsTagsPage } from "./pages/SettingsTagsPage";
import { WikiPage } from "./pages/WikiPage";

export default function App() {
  return (
    <div className="flex min-h-screen bg-shell text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/features/:id" element={<FeatureDetailPage />} />
            <Route path="/wiki" element={<WikiPage />} />
            <Route path="/wiki/:id" element={<WikiPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings/tags" element={<SettingsTagsPage />} />
            <Route path="/settings/backup" element={<SettingsBackupPage />} />
            <Route path="/settings/test-data" element={<SettingsSeedDataPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
