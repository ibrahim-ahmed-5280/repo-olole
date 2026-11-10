import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { hasPermission, type Permission } from '@reveal/shared';
import { disableAnalytics } from '../lib/analytics';
import { Spinner } from '../components/ui/primitives';
import { MotionPreferenceProvider } from '../lib/motion';
import { useMe } from './api';
import { ToastProvider } from './components/ui';
import { AdminLayout } from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import CandidatePage from './pages/CandidatePage';
import RoadmapsPage from './pages/RoadmapsPage';
import RoadmapEditorPage from './pages/RoadmapEditorPage';
import FeedbackInboxPage from './pages/FeedbackInboxPage';
import FeedbackAnalyticsPage from './pages/FeedbackAnalyticsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MediaPage from './pages/MediaPage';
import SettingsPage from './pages/SettingsPage';
import SecurityPage from './pages/SecurityPage';
import AuditPage from './pages/AuditPage';
import { PreviewRoadmapPage, PreviewVisionPage } from './pages/PreviewPages';

function Guard({ permission, children }: { permission?: Permission; children: React.ReactNode }) {
  const me = useMe();
  if (permission && !hasPermission(me.data?.user.role, permission)) {
    return <p role="alert" className="rounded-xl border border-line p-6 text-muted">Your role does not have access to this page.</p>;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  const me = useMe();
  const location = useLocation();
  useEffect(() => {
    disableAnalytics(); // admin activity is never counted in visitor analytics
    document.title = 'Admin · THE REVEAL';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  if (me.isPending) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;

  if (!me.data) {
    return (
      <ToastProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/admin/login" replace state={{ from: location.pathname }} />} />
        </Routes>
      </ToastProvider>
    );
  }

  return (
    <MotionPreferenceProvider animationsEnabled>
      <ToastProvider>
        <Routes>
          <Route path="preview/vision" element={<Guard permission="content:read"><PreviewVisionPage /></Guard>} />
          <Route path="preview/roadmap/:slug" element={<Guard permission="content:read"><PreviewRoadmapPage /></Guard>} />
          <Route element={<AdminLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="login" element={<Navigate to="/admin" replace />} />
            <Route path="candidate" element={<Guard permission="content:read"><CandidatePage /></Guard>} />
            <Route path="roadmaps" element={<Guard permission="content:read"><RoadmapsPage /></Guard>} />
            <Route path="roadmaps/:slug" element={<Guard permission="content:read"><RoadmapEditorPage /></Guard>} />
            <Route path="feedback" element={<Guard permission="feedback:read"><FeedbackInboxPage /></Guard>} />
            <Route path="feedback-analytics" element={<Guard permission="analytics:read"><FeedbackAnalyticsPage /></Guard>} />
            <Route path="analytics" element={<Guard permission="analytics:read"><AnalyticsPage /></Guard>} />
            <Route path="media" element={<Guard permission="media:write"><MediaPage /></Guard>} />
            <Route path="settings" element={<Guard permission="settings:write"><SettingsPage /></Guard>} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="audit" element={<Guard permission="audit:read"><AuditPage /></Guard>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </MotionPreferenceProvider>
  );
}
