import { candidateDedupeKey } from "./dedupe";
import type { CandidateInput, EditionMappingInput, SourceDecisionInput } from "./types";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteNullable(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return "null";
  return quote(value.trim());
}

function textArray(values: string[]): string {
  if (!values.length) return "array[]::text[]";
  return `array[${values.map(quote).join(",")}]`;
}

export function upsertCandidateSql(input: CandidateInput): string {
  const dedupe = candidateDedupeKey({
    eventName: input.eventName,
    editionYear: input.editionYear ?? null,
    resultsUrls: input.resultsUrls,
  });
  const unresolved = input.unresolvedFields ?? [];
  return `
insert into public.acquisition_candidates (
  event_name, official_website, edition_year, starts_on, location_text,
  distances, results_urls, discovery_source, discovered_at,
  review_status, unresolved_fields, dedupe_key, updated_at
) values (
  ${quote(input.eventName)},
  ${quoteNullable(input.officialWebsite)},
  ${input.editionYear ?? "null"},
  ${input.startsOn ? `${quote(input.startsOn)}::date` : "null"},
  ${quoteNullable(input.locationText)},
  ${textArray(input.distances ?? [])},
  ${textArray(input.resultsUrls)},
  ${quote(input.discoverySource ?? "manual")},
  ${input.discoveredAt ? `${quote(input.discoveredAt)}::timestamptz` : "now()"},
  'pending',
  ${textArray(unresolved)},
  ${quote(dedupe)},
  now()
)
on conflict (dedupe_key) do update set
  event_name = excluded.event_name,
  official_website = coalesce(excluded.official_website, public.acquisition_candidates.official_website),
  edition_year = coalesce(excluded.edition_year, public.acquisition_candidates.edition_year),
  starts_on = coalesce(excluded.starts_on, public.acquisition_candidates.starts_on),
  results_urls = case
    when cardinality(excluded.results_urls) > 0 then excluded.results_urls
    else public.acquisition_candidates.results_urls
  end,
  discovery_source = excluded.discovery_source,
  discovered_at = excluded.discovered_at,
  unresolved_fields = excluded.unresolved_fields,
  updated_at = now()
returning id;
`.trim();
}

export function upsertSourceDecisionSql(input: SourceDecisionInput): string {
  const display = input.displayAllowed === true;
  return `
insert into public.acquisition_source_decisions (
  candidate_id, source_slug, decision, access_method, storage_allowed, display_allowed,
  attribution, reuse_notes, evidence_url, reviewer, reviewed_at, notes
) values (
  ${input.candidateId ?? "null"},
  ${quote(input.sourceSlug)},
  ${quote(input.decision)},
  ${quote(input.accessMethod ?? "")},
  ${input.storageAllowed ? "true" : "false"},
  ${display ? "true" : "false"},
  ${quote(input.attribution ?? "")},
  ${quote(input.reuseNotes ?? "")},
  ${quoteNullable(input.evidenceUrl)},
  ${quoteNullable(input.reviewer)},
  ${input.decision === "pending" ? "null" : "now()"},
  ${quote(input.notes ?? "")}
)
on conflict (source_slug) do update set
  candidate_id = coalesce(excluded.candidate_id, public.acquisition_source_decisions.candidate_id),
  decision = excluded.decision,
  access_method = excluded.access_method,
  storage_allowed = excluded.storage_allowed,
  display_allowed = excluded.display_allowed,
  attribution = excluded.attribution,
  reuse_notes = excluded.reuse_notes,
  evidence_url = excluded.evidence_url,
  reviewer = excluded.reviewer,
  reviewed_at = excluded.reviewed_at,
  notes = excluded.notes;
`.trim();
}

export function upsertEditionMappingSql(input: EditionMappingInput): string {
  return `
insert into public.acquisition_edition_mappings (
  candidate_id, source_decision_id, adapter, population_key, external_event_id,
  distance_slug, edition_year, event_name, starts_on, source_url, adapter_config,
  approved_at, approved_by
) values (
  ${input.candidateId},
  ${input.sourceDecisionId},
  ${quote(input.adapter)},
  ${quote(input.populationKey)},
  ${quoteNullable(input.externalEventId)},
  ${quote(input.distanceSlug)},
  ${input.editionYear},
  ${quote(input.eventName)},
  ${input.startsOn ? `${quote(input.startsOn)}::date` : "null"},
  ${quote(input.sourceUrl)},
  ${quote(JSON.stringify(input.adapterConfig ?? {}))}::jsonb,
  ${input.approvedBy ? "now()" : "null"},
  ${quoteNullable(input.approvedBy)}
)
on conflict (population_key) do update set
  source_url = excluded.source_url,
  adapter_config = excluded.adapter_config,
  approved_at = excluded.approved_at,
  approved_by = excluded.approved_by;
`.trim();
}
