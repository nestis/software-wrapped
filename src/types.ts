export interface PullRequestMetric {
  pk: string;           // {source}#{projectKey}/{repoSlug}
  sk: string;           // PR#{prId}
  prId: string;
  dateOpened: string;    // ISO 8601
  size: number;          // additions + deletions
  author: string;
  team: string;          // maps to project key / org
  source: "bitbucket" | "github";
  repository: string;    // projectKey/repoSlug or org/repo
  allPrs: string;        // constant "ALL" for GSI queries
}

export interface RepositoryConfig {
  source: "bitbucket" | "github";
  project: string;       // Bitbucket project key or GitHub org
  team: string;          // team name for aggregation
  exclude?: string[];    // repo slugs to exclude (all repos are included by default)
}

export interface FetchRequest {
  from: string;          // ISO 8601 date
  to: string;            // ISO 8601 date
}

export type PeriodGranularity = "week" | "month" | "bimonthly" | "quarter" | "year";

export interface MetricsQuery {
  from: string;
  to: string;
  period: PeriodGranularity;
  team?: string;
  author?: string;
}

export interface PeriodBucket {
  periodStart: string;
  periodEnd: string;
  label: string;
  totalPRs: number;
}

export interface AggregatedMetrics {
  query: MetricsQuery;
  totalPRs: number;
  byPeriod: PeriodBucket[];
  byEngineer: Record<string, PeriodBucket[]>;
  byTeam: Record<string, PeriodBucket[]>;
}
