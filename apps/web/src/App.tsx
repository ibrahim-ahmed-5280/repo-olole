import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { PublicLayout } from './components/layout/PublicLayout';
import { Spinner } from './components/ui/primitives';
import IntroPage from './pages/IntroPage';
import NotFoundPage from './pages/NotFoundPage';

// Route-level code splitting: the admin (and charts) never load for public visitors.
const VisionPage = lazy(() => import('./pages/VisionPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

const fallback = (
  <div className="grid min-h-dvh place-items-center bg-bg">
    <Spinner />
  </div>
);
const s = (node: React.ReactNode) => <Suspense fallback={fallback}>{node}</Suspense>;

export const routes = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <IntroPage /> },
      { path: '/vision', element: s(<VisionPage />) },
      { path: '/roadmap/:slug', element: s(<RoadmapPage />) },
      { path: '/privacy', element: s(<PrivacyPage />) },
    ],
  },
  { path: '/admin/*', element: s(<AdminApp />) },
  { path: '*', element: <NotFoundPage /> },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
