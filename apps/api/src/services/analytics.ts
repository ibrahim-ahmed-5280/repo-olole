import crypto from 'node:crypto';
import { Types } from 'mongoose';
import {
  PILLAR_SLUGS,
  completionRate,
  dayKey,
  enumerateDays,
  groupByWeek,
  summarizeFeedback,
  type AnalyticsEventInput,
  type AnalyticsSummaryDTO,
  type PillarSlug,
  type ResolvedRange,
} from '@reveal/shared';
import { AnalyticsDaily, AnalyticsDedup, Feedback } from '../models/records';
import { Milestone, Pillar } from '../models/content';

export const ANALYTICS_METHODOLOGY =
  'Page views are counted once per browser tab session per route within 30 minutes. ' +
  'Sessions are approximate: a random token lives only in the visitor\'s sessionStorage (one per tab, cleared when the tab closes) ' +
  'and is reduced to a keyed hash that rotates daily and is deleted within 48 hours. ' +
  'A person with several tabs or devices counts as several sessions, and returning visitors are not recognised on later days, ' +
  'so sessions are NOT unique people. Completion rate = sessions that reached the end of a roadmap ÷ sessions that opened it. ' +
  'Feedback percentages describe only visitors who chose to respond and are not an election poll.';

const hmac = (key: string | Buffer, value: string) => crypto.createHmac('sha256', key).update(value).digest('base64url');

/** Inserts a dedup key; returns true only the first time the key is seen before it expires. */
async function firstSeen(key: string, ttlMs: number): Promise<boolean> {
  const r = await AnalyticsDedup.updateOne(
    { key },
    { $setOnInsert: { key, expiresAt: new Date(Date.now() + ttlMs) } },
    { upsert: true },
  ).catch((e: { code?: number }) => {
    if (e.code === 11000) return { upsertedCount: 0 };
    throw e;
  });
  return r.upsertedCount === 1;
}

async function increment(date: string, filter: Record<string, unknown>, now: Date) {
  await AnalyticsDaily.updateOne(
    { date, route: '*', pillar: null, milestoneId: null, target: null, ...filter },
    { $inc: { count: 1 }, $setOnInsert: { 'aggregationMetadata.firstAt': now }, $set: { 'aggregationMetadata.lastAt': now } },
    { upsert: true },
  );
}

export async function recordEvent(input: AnalyticsEventInput, secret: string, now = new Date()): Promise<{ counted: boolean }> {
  const date = dayKey(now);
  const dailySalt = hmac(secret, `salt:${date}`);
  const sessionHash = hmac(dailySalt, input.sid);

  if (await firstSeen(`s:${sessionHash}`, 48 * 3_600_000)) {
    await increment(date, { eventType: 'session' }, now);
  }

  const eventKey = hmac(sessionHash, [input.type, input.route, input.pillar ?? '', input.milestoneId ?? '', input.target ?? ''].join('|'));
  if (!(await firstSeen(`e:${eventKey}`, 30 * 60_000))) return { counted: false };

  await increment(
    date,
    {
      eventType: input.type,
      route: input.route,
      pillar: input.pillar ?? null,
      milestoneId: input.milestoneId ? new Types.ObjectId(input.milestoneId) : null,
      target: input.target ?? null,
    },
    now,
  );
  return { counted: true };
}

export async function analyticsSummary(range: ResolvedRange): Promise<AnalyticsSummaryDTO> {
  const match = { date: { $gte: range.from, $lte: range.to } };

  const [byTypeDay, byPillar, byMilestone, feedbackByPillar, feedbackByDay] = await Promise.all([
    AnalyticsDaily.aggregate<{ _id: { date: string; type: string }; count: number }>([
      { $match: match },
      { $group: { _id: { date: '$date', type: '$eventType' }, count: { $sum: '$count' } } },
    ]),
    AnalyticsDaily.aggregate<{ _id: { pillar: string; type: string }; count: number }>([
      { $match: { ...match, pillar: { $ne: null } } },
      { $group: { _id: { pillar: '$pillar', type: '$eventType' }, count: { $sum: '$count' } } },
    ]),
    AnalyticsDaily.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { ...match, eventType: 'milestone_view', milestoneId: { $ne: null } } },
      { $group: { _id: '$milestoneId', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Feedback.aggregate<{ _id: { pillar: string; response: string }; count: number }>([
      { $match: { createdAt: { $gte: range.start, $lt: range.endExclusive } } },
      { $group: { _id: { pillar: '$pillar', response: '$response' }, count: { $sum: 1 } } },
    ]),
    Feedback.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: range.start, $lt: range.endExclusive } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const dayMap = new Map(enumerateDays(range).map((d) => [d, { date: d, pageViews: 0, sessions: 0, feedback: 0 }]));
  const eventTotals = new Map<string, number>();
  for (const row of byTypeDay) {
    eventTotals.set(row._id.type, (eventTotals.get(row._id.type) ?? 0) + row.count);
    const day = dayMap.get(row._id.date);
    if (!day) continue;
    if (row._id.type === 'page_view') day.pageViews += row.count;
    if (row._id.type === 'session') day.sessions += row.count;
  }
  for (const row of feedbackByDay) {
    const day = dayMap.get(row._id);
    if (day) day.feedback += row.count;
  }
  const daily = [...dayMap.values()];

  const pillarCount = (pillar: string, type: string) =>
    byPillar.filter((r) => r._id.pillar === pillar && r._id.type === type).reduce((s, r) => s + r.count, 0);

  const roadmaps = PILLAR_SLUGS.map((pillar) => {
    const views = pillarCount(pillar, 'roadmap_view');
    const completions = pillarCount(pillar, 'roadmap_complete');
    return { pillar, views, completions, completionRate: completionRate(views, completions), hotspotClicks: pillarCount(pillar, 'hotspot_click') };
  });

  const milestoneDocs = await Milestone.find({ _id: { $in: byMilestone.map((m) => m._id) } }).select('title pillarId').lean();
  const pillars = await Pillar.find().select('slug').lean();
  const pillarSlugById = new Map(pillars.map((p) => [String(p._id), p.slug as PillarSlug]));
  const topMilestones = byMilestone.map((m) => {
    const doc = milestoneDocs.find((d) => String(d._id) === String(m._id));
    return {
      milestoneId: String(m._id),
      title: doc?.title ?? '(deleted milestone)',
      pillar: doc ? pillarSlugById.get(String(doc.pillarId)) ?? null : null,
      views: m.count,
    };
  });

  const feedback = PILLAR_SLUGS.map((pillar) => {
    const yes = feedbackByPillar.find((r) => r._id.pillar === pillar && r._id.response === 'yes')?.count ?? 0;
    const no = feedbackByPillar.find((r) => r._id.pillar === pillar && r._id.response === 'no')?.count ?? 0;
    return { pillar, ...summarizeFeedback(yes, no) };
  });

  const weekly = groupByWeek(daily, (acc, row) => {
    acc.pageViews = (acc.pageViews ?? 0) + row.pageViews;
    acc.sessions = (acc.sessions ?? 0) + row.sessions;
  }) as AnalyticsSummaryDTO['weekly'];

  return {
    range: { from: range.from, to: range.to, days: range.days },
    totals: {
      pageViews: eventTotals.get('page_view') ?? 0,
      sessions: eventTotals.get('session') ?? 0,
      roadmapViews: roadmaps.reduce((s, r) => s + r.views, 0),
      completions: roadmaps.reduce((s, r) => s + r.completions, 0),
      feedback: feedback.reduce((s, f) => s + f.total, 0),
    },
    daily,
    weekly,
    roadmaps,
    topMilestones,
    feedback,
    events: [...eventTotals.entries()].filter(([t]) => t !== 'session').map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    methodology: ANALYTICS_METHODOLOGY,
  };
}
