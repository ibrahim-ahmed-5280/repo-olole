import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CandidateDTO, PillarDTO } from '@reveal/shared';
import { I18nProvider } from '../i18n';
import { MotionPreferenceProvider } from '../lib/motion';

export function renderWithProviders(ui: ReactNode, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initial="so">
        <MotionPreferenceProvider animationsEnabled={false}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </MotionPreferenceProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

export const candidateFixture: CandidateDTO = {
  name: 'Test Candidate',
  title: 'Candidate title',
  introduction: 'Hello',
  biography: '',
  education: ['BSc'],
  experience: [],
  skills: ['Teamwork'],
  motivation: '',
  vision: '',
  achievements: [],
  portrait: { url: '/media/a.jpg', width: 1000, height: 1250, altText: '', variants: [] },
  pose: {
    image: { url: '/media/a.jpg', width: 1000, height: 1250, altText: '', variants: [] },
    isPlaceholder: true,
    focal: { x: 0.5, y: 0.3 },
    anchors: { education: { x: 0.1, y: 0.9 }, unity: { x: 0.9, y: 0.9 }, leadership: { x: 0.5, y: 0.95 }, about: { x: 0.6, y: 0.7 } },
  },
  version: 1,
  publishedAt: null,
};

export const pillarsFixture: PillarDTO[] = [
  { slug: 'waxbarasho', name: 'WAXBARASHO', subtitle: 'Tiirka 1aad', tagline: 'Edu', description: '', conclusion: '', icon: 'graduation-cap', theme: 'education', order: 1, milestoneCount: 2 },
  { slug: 'midnimo', name: 'MIDNIMO', subtitle: 'Tiirka 2aad', tagline: 'Unity', description: '', conclusion: '', icon: 'handshake', theme: 'unity', order: 2, milestoneCount: 2 },
  { slug: 'hoggaan', name: 'HOGGAAN', subtitle: 'Tiirka 3aad', tagline: 'Lead', description: '', conclusion: '', icon: 'compass', theme: 'leadership', order: 3, milestoneCount: 2 },
];
