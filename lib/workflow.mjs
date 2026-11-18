import { createHash } from 'node:crypto';
import { score } from './scoring.mjs';

export const AS_OF = '2026-11-17T12:00:00Z';
export const WATERMARK = 'SYNTHETIC DEMO — fictional accounts and evidence. No outreach sent.';

export function validate(campaign, accounts) {
  const dimensions = campaign.scoring_dimensions;
  if (!Array.isArray(dimensions) || dimensions.length !== 5 || dimensions.reduce((n, d) => n + d.weight, 0) !== 100 ||
      dimensions.some(d => !Number.isFinite(d.weight) || d.weight <= 0) || new Set(dimensions.map(d => d.key)).size !== 5) throw Error('Invalid campaign weights or dimensions');
  if (!Array.isArray(accounts) || !accounts.length || new Set(accounts.map(p => p.id)).size !== accounts.length) throw Error('Invalid or duplicate accounts');
  for (const p of accounts) {
    if (p.demo !== true || !p.name.startsWith('DEMO ') || !/^[a-z][a-z0-9-]*$/.test(p.id) || p.campaign_slug !== campaign.slug) throw Error('Only this campaign’s explicit synthetic accounts are accepted');
    if (!['none', 'suspected', 'verified'].includes(p.exclusion) || typeof p.suppressed !== 'boolean') throw Error('Invalid eligibility state');
    const ids = new Set(p.evidence.map(e => e.id));
    if (ids.size !== p.evidence.length || p.evidence.some(e => e.demo !== true || !['synthetic','job_posting'].includes(e.source_type) || !['verified','unverified','rejected'].includes(e.verified_status) || !e.excerpt?.trim() || !e.source_url?.startsWith('demo://') || Number.isNaN(Date.parse(e.observed_at)))) throw Error('Evidence must be unique, dated synthetic fixtures with demo:// references');
    if (new Set(p.reviewed_dimension_ratings.map(r => r.dimension_key)).size !== p.reviewed_dimension_ratings.length) throw Error('Duplicate rating');
    for (const r of p.reviewed_dimension_ratings) {
      if (!dimensions.some(d => d.key === r.dimension_key) || ![0, 0.5, 1, null].includes(r.rating) || typeof r.reviewed !== 'boolean' || !Array.isArray(r.evidence_ids) || r.evidence_ids.some(id => !ids.has(id))) throw Error('Invalid rating or orphan evidence');
    }
  }
}

export function brief(p, c, at = AS_OF) {
  const s = score(p, c, new Date(at));
  const observations = p.evidence.filter(e => s.dimensions.some(d => d.evidence_ids.includes(e.id)));
  return { ...s, observations, body: `${WATERMARK}\n\n${p.name}\nFit: ${s.numeric_score ?? 'unknown'}/100; evidence coverage: ${s.evidence_coverage_pct}%.\nEligibility: ${s.eligibility}; confidence: ${s.confidence_band}.\n\nReviewed observations\n${observations.map(e => `[${e.id}] ${e.excerpt} (${e.source_url}; observed ${e.observed_at.slice(0,10)})`).join('\n') || 'No current reviewed observations.'}\n\nResearch hypothesis: ${p.hypothesis}\nUnknowns: ${s.unknowns.join(', ') || 'None of the configured dimensions; buyer need and intent still require validation.'}\nNext step: ${p.next_action}\n\nA hiring signal does not establish budget, buying intent or a customer relationship.\n` };
}

export function reviewHash(p, c, at = AS_OF) {
  return createHash('sha256').update(JSON.stringify({ name:p.name, contact_basis:p.contact_basis, result:brief(p,c,at) })).digest('hex');
}

export function reviewStatus(p, c, at = AS_OF) {
  const s = score(p, c, new Date(at));
  if (p.suppressed || s.eligibility !== 'eligible') return 'blocked';
  if (!p.approval) return 'needs review';
  if (!p.approval.reviewer?.trim() || p.approval.hash !== reviewHash(p,c,at)) return 'stale';
  return 'approved';
}

export function approve(p, c, reviewer, at = AS_OF) {
  if (!reviewer?.trim() || !p.contact_basis?.trim()) throw Error('An explicit reviewer and synthetic contact basis are required');
  const s=score(p,c,new Date(at));
  if (p.suppressed || s.eligibility !== 'eligible') throw Error('Suppressed or unqualified accounts cannot be approved');
  p.approval={ reviewer:reviewer.trim(), hash:reviewHash(p,c,at), reviewed_at:at };
}

export function approvedExport(p,c,at = AS_OF) {
  if (reviewStatus(p,c,at) !== 'approved') throw Error('Export blocked: a current explicit review is required');
  return brief(p,c,at).body + `\nReviewed by: ${p.approval.reviewer}\nThis is a local research-brief export, not a sent message.\n`;
}
