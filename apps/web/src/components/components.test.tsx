import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackForm } from './feedback/FeedbackForm';
import { BiographyPanel } from './candidate/BiographyPanel';
import { PillarNavigation } from './candidate/PillarNavigation';
import { InteractiveCandidate } from './candidate/InteractiveCandidate';
import { buildWindingPath } from './roadmap/RoadmapPath';
import { candidateFixture, pillarsFixture, renderWithProviders } from '../test/utils';
import { __resetAnalytics } from '../lib/analytics';

beforeEach(() => {
  sessionStorage.clear();
  __resetAnalytics();
  vi.restoreAllMocks();
});

describe('FeedbackForm', () => {
  it('requires a Yes/No answer before submitting', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderWithProviders(<FeedbackForm pillar="midnimo" />);
    await userEvent.click(screen.getByRole('button', { name: 'Dir fikradda' }));
    expect(await screen.findByText('Fadlan dooro Haa ama Maya.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits the answer and optional suggestion, then confirms', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { received: true } }), { status: 201 }));
    renderWithProviders(<FeedbackForm pillar="midnimo" />);
    await userEvent.click(screen.getByLabelText('Haa'));
    await userEvent.type(screen.getByLabelText(/Maxaad hagaajin/), 'More events');
    await userEvent.click(screen.getByRole('button', { name: 'Dir fikradda' }));
    expect(await screen.findByTestId('feedback-success')).toHaveTextContent('Mahadsanid');
    const feedbackCall = fetchSpy.mock.calls.find(([url]) => String(url).endsWith('/feedback'))!;
    expect(JSON.parse(String(feedbackCall[1]!.body))).toEqual({ pillar: 'midnimo', response: 'yes', suggestion: 'More events' });
  });

  it('shows a friendly error when submission fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: 'X', message: 'x' } }), { status: 500 }));
    renderWithProviders(<FeedbackForm pillar="hoggaan" />);
    await userEvent.click(screen.getByLabelText('Maya'));
    await userEvent.click(screen.getByRole('button', { name: 'Dir fikradda' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Fikradda lama dirin');
  });

  it('can be skipped without pressure', async () => {
    renderWithProviders(<FeedbackForm pillar="hoggaan" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ka gudub' }));
    expect(screen.getByText(/Waad ka gudubtay/)).toBeInTheDocument();
  });
});

describe('BiographyPanel', () => {
  it('opens as a labelled modal, closes on Escape and only shows filled sections', async () => {
    const onClose = vi.fn();
    renderWithProviders(<BiographyPanel candidate={candidateFixture} open onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Ku saabsan musharaxa' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('BSc')).toBeInTheDocument();
    expect(screen.queryByText('Guulaha')).not.toBeInTheDocument(); // empty achievements hidden
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Pillar navigation', () => {
  it('provides a text-based equivalent of every hotspot', async () => {
    const onAbout = vi.fn();
    renderWithProviders(<PillarNavigation pillars={pillarsFixture} onOpenAbout={onAbout} />);
    expect(screen.getByRole('link', { name: /WAXBARASHO/ })).toHaveAttribute('href', '/roadmap/waxbarasho');
    expect(screen.getByRole('link', { name: /MIDNIMO/ })).toHaveAttribute('href', '/roadmap/midnimo');
    expect(screen.getByRole('link', { name: /HOGGAAN/ })).toHaveAttribute('href', '/roadmap/hoggaan');
    await userEvent.click(screen.getByTestId('about-link'));
    expect(onAbout).toHaveBeenCalled();
  });
});

describe('InteractiveCandidate', () => {
  it('renders accessible hotspots and the placeholder notice', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 480, height: 600, top: 0, left: 0, right: 480, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
    renderWithProviders(<InteractiveCandidate candidate={candidateFixture} pillars={pillarsFixture} onOpenAbout={() => {}} />);
    expect(await screen.findByRole('link', { name: 'Fur khariidadda WAXBARASHO' })).toHaveAttribute('href', '/roadmap/waxbarasho');
    expect(screen.getByRole('button', { name: 'Fur warbixinta musharaxa' })).toBeInTheDocument();
    expect(screen.getByText('Sawir ku meel gaar ah')).toBeInTheDocument();
    // Candidate's right hand (education) is on the viewer's left
    const edu = screen.getByTestId('hotspot-education');
    const unity = screen.getByTestId('hotspot-unity');
    await waitFor(() => expect(parseFloat(edu.style.left)).toBeLessThan(parseFloat(unity.style.left)));
  });
});

describe('buildWindingPath', () => {
  it('passes through every node with cubic segments', () => {
    const d = buildWindingPath([{ x: 50, y: 100 }, { x: 50, y: 200 }], 20, { x: 50, y: 0 }, { x: 50, y: 300 });
    expect(d.startsWith('M 50.0 0.0')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(3);
    expect(d).toContain('50.0 100.0');
    expect(d.endsWith('50.0 300.0')).toBe(true);
  });
});
