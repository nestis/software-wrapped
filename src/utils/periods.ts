import { PeriodBucket, PeriodGranularity, PullRequestMetric } from "../types";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1)); // Monday
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addPeriod(date: Date, period: PeriodGranularity): Date {
  const d = new Date(date);
  switch (period) {
    case "week":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "month":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "bimonthly":
      d.setUTCMonth(d.getUTCMonth() + 2);
      break;
    case "quarter":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "year":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}

function getPeriodStart(date: Date, period: PeriodGranularity): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case "week":
      return getWeekStart(d);
    case "month":
      d.setUTCDate(1);
      return d;
    case "bimonthly":
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (d.getUTCMonth() % 2));
      return d;
    case "quarter":
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - (d.getUTCMonth() % 3));
      return d;
    case "year":
      d.setUTCDate(1);
      d.setUTCMonth(0);
      return d;
  }
}

function formatLabel(date: Date, period: PeriodGranularity): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  switch (period) {
    case "week":
      return `W-${year}-${month}-${day}`;
    case "month":
      return `${year}-${month}`;
    case "bimonthly":
      return `${year}-${month} to ${year}-${String(date.getUTCMonth() + 2).padStart(2, "0")}`;
    case "quarter":
      return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    case "year":
      return `${year}`;
  }
}

export function generateBuckets(
  from: Date,
  to: Date,
  period: PeriodGranularity
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  let current = getPeriodStart(from, period);

  while (current < to) {
    const next = addPeriod(current, period);
    buckets.push({
      periodStart: current.toISOString(),
      periodEnd: next.toISOString(),
      label: formatLabel(current, period),
      totalPRs: 0,
    });
    current = next;
  }

  return buckets;
}

export function bucketMetrics(
  metrics: PullRequestMetric[],
  from: Date,
  to: Date,
  period: PeriodGranularity
): PeriodBucket[] {
  const buckets = generateBuckets(from, to, period);

  for (const metric of metrics) {
    const date = new Date(metric.dateOpened);
    for (const bucket of buckets) {
      if (
        date >= new Date(bucket.periodStart) &&
        date < new Date(bucket.periodEnd)
      ) {
        bucket.totalPRs++;
        break;
      }
    }
  }

  return buckets;
}

export function groupAndBucket(
  metrics: PullRequestMetric[],
  groupBy: (m: PullRequestMetric) => string,
  from: Date,
  to: Date,
  period: PeriodGranularity
): Record<string, PeriodBucket[]> {
  const groups: Record<string, PullRequestMetric[]> = {};

  for (const metric of metrics) {
    const key = groupBy(metric);
    if (!groups[key]) groups[key] = [];
    groups[key].push(metric);
  }

  const result: Record<string, PeriodBucket[]> = {};
  for (const [key, items] of Object.entries(groups)) {
    result[key] = bucketMetrics(items, from, to, period);
  }

  return result;
}
