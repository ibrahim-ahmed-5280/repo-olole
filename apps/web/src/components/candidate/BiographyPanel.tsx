import type { CandidateDTO } from '@reveal/shared';
import { useT } from '../../i18n';
import { CandidatePortrait } from '../intro/CandidatePortrait';
import { Dialog } from '../ui/Dialog';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-glow">{title}</h3>
      {children}
    </section>
  );
}

const Paragraphs = ({ text }: { text: string }) => (
  <div className="space-y-3 text-[15px] leading-relaxed text-ink/90">
    {text.split(/\n{2,}/).map((p, i) => (
      <p key={i} className="whitespace-pre-line">{p}</p>
    ))}
  </div>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink/90 marker:text-primary">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
);

/** Candidate biography — renders only the sections the campaign has filled in (nothing is invented). */
export function BiographyPanel({ candidate, open, onClose }: { candidate: CandidateDTO; open: boolean; onClose: () => void }) {
  const t = useT();
  const hasAny =
    candidate.introduction || candidate.biography || candidate.motivation || candidate.vision ||
    candidate.education.length || candidate.experience.length || candidate.skills.length || candidate.achievements.length;
  return (
    <Dialog open={open} onClose={onClose} title={t.about.title} closeLabel={t.about.close} testId="about-panel">
      <div className="flex items-center gap-4">
        <div className="w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-bg">
          <CandidatePortrait image={candidate.portrait} alt={`${t.intro.portraitAlt}: ${candidate.name}`} masked="none" sizes="96px" />
        </div>
        <div>
          <p className="font-display text-xl font-bold">{candidate.name}</p>
          {candidate.title && <p className="mt-1 text-sm text-muted">{candidate.title}</p>}
        </div>
      </div>

      {candidate.introduction && <Section title={t.about.introduction}><Paragraphs text={candidate.introduction} /></Section>}
      {candidate.biography && <Section title={t.about.biography}><Paragraphs text={candidate.biography} /></Section>}
      {candidate.education.length > 0 && <Section title={t.about.education}><List items={candidate.education} /></Section>}
      {candidate.experience.length > 0 && <Section title={t.about.experience}><List items={candidate.experience} /></Section>}
      {candidate.skills.length > 0 && (
        <Section title={t.about.skills}>
          <ul className="flex flex-wrap gap-2">
            {candidate.skills.map((s) => (
              <li key={s} className="rounded-full border border-line bg-elevated px-3 py-1 text-sm">{s}</li>
            ))}
          </ul>
        </Section>
      )}
      {candidate.motivation && <Section title={t.about.motivation}><Paragraphs text={candidate.motivation} /></Section>}
      {candidate.vision && <Section title={t.about.vision}><Paragraphs text={candidate.vision} /></Section>}
      {candidate.achievements.length > 0 && <Section title={t.about.achievements}><List items={candidate.achievements} /></Section>}
      {!hasAny && <p className="mt-8 rounded-2xl border border-dashed border-line p-5 text-center text-muted">{t.about.comingSoon}</p>}
    </Dialog>
  );
}
