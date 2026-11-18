// Adapted from the local GTM prototype scoring module; see PROVENANCE.md.
import { createHash } from "node:crypto";
export function inputHash(p, c) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        evidence: p.evidence,
        ratings: p.reviewed_dimension_ratings,
        exclusion: p.exclusion,
        config: c,
        suppressed: p.suppressed,
        commercial: p.commercial
          ? { ...p.commercial, events: undefined, pipeline: undefined }
          : undefined,
      }),
    )
    .digest("hex");
}
export function fresh(e, at = new Date()) {
  const age = (at.getTime() - Date.parse(e.observed_at)) / 86400000;
  return age >= -1 && (e.source_type !== "job_posting" || age <= 14);
}
export function usable(e, p, at = new Date()) {
  return e.verified_status === "verified" && e.demo === p.demo && fresh(e, at);
}
function evenRound(n) {
  const floor = Math.floor(n);
  return Math.abs(n - floor - 0.5) < 1e-9 ? floor + (floor % 2) : Math.round(n);
}
export function score(p, c, at = new Date()) {
  const dimensions = c.scoring_dimensions.map((d) => {
    const r = p.reviewed_dimension_ratings.find(
      (r) => r.dimension_key === d.key,
    );
    const sources =
      r?.evidence_ids
        .map((id) => p.evidence.find((e) => e.id === id))
        .filter((e) => !!e && usable(e, p, at)) ?? [];
    const rating = r?.reviewed && sources.length ? r.rating : null;
    return {
      ...d,
      rating: rating ?? null,
      evidence_ids: sources.map((e) => e.id),
      reason:
        r?.reason ??
        (rating == null
          ? "No current reviewed support"
          : "Reviewed observation"),
    };
  });
  const coverage = dimensions.reduce(
    (n, d) => n + (d.rating == null ? 0 : d.weight),
    0,
  );
  const numeric = coverage
    ? evenRound(
        (100 * dimensions.reduce((n, d) => n + d.weight * (d.rating ?? 0), 0)) /
          coverage,
      )
    : null;
  const eligibility =
    p.exclusion === "verified"
      ? "excluded"
      : p.exclusion === "suspected" || !coverage
        ? "review"
        : "eligible";
  const band =
    eligibility === "excluded" || coverage < 35
      ? "unrated"
      : coverage < 60
        ? numeric >= 55
          ? "medium"
          : "low"
        : numeric >= 75
          ? "high"
          : numeric >= 55
            ? "medium"
            : "low";
  const verified = p.evidence.filter(
    (e) => usable(e, p, at) && !e.demo && e.reliability !== "unreviewed",
  );
  const families = new Set(
    verified
      .filter((e) => e.source_url)
      .map((e) => {
        if (e.source_family) return e.source_family;
        const h = new URL(e.source_url).hostname.replace(/^www\./, "");
        return h.split(".").slice(-2).join(".");
      }),
  );
  const confidence =
    eligibility === "excluded" || p.exclusion === "suspected"
      ? "low"
      : coverage >= 75 && families.size >= 2
        ? "high"
        : coverage >= 50 && verified.length
          ? "medium"
          : "low";
  return {
    numeric_score: numeric,
    evidence_coverage_pct: coverage,
    band,
    eligibility,
    confidence_band: confidence,
    dimensions,
    unknowns: dimensions.filter((d) => d.rating == null).map((d) => d.label),
    input_hash: inputHash(p, c),
  };
}
