import { Router, Request, Response } from "express";
import { DynamoService } from "../services/dynamo";
import { AggregatedMetrics, MetricsQuery, PeriodGranularity } from "../types";
import { bucketMetrics, groupAndBucket } from "../utils/periods";

const router = Router();
const dynamoService = new DynamoService();

const VALID_PERIODS: PeriodGranularity[] = [
  "week",
  "month",
  "bimonthly",
  "quarter",
  "year",
];

/**
 * GET /api/metrics
 * Query params:
 *   from     - ISO 8601 date (required)
 *   to       - ISO 8601 date (required)
 *   period   - week | month | bimonthly | quarter | year (required)
 *   team     - filter by team (optional)
 *   author   - filter by author (optional)
 */
router.get("/", async (req: Request, res: Response) => {
  const { from, to, period, team, author } = req.query as Record<string, string>;

  if (!from || !to || !period) {
    res.status(400).json({
      error: "'from', 'to', and 'period' query params are required",
    });
    return;
  }

  if (!VALID_PERIODS.includes(period as PeriodGranularity)) {
    res.status(400).json({
      error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}`,
    });
    return;
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601" });
    return;
  }

  const query: MetricsQuery = {
    from,
    to,
    period: period as PeriodGranularity,
    team,
    author,
  };

  let metrics;

  if (author) {
    metrics = await dynamoService.queryByAuthorAndDateRange(author, from, to);
  } else if (team) {
    metrics = await dynamoService.queryByTeamAndDateRange(team, from, to);
  } else {
    metrics = await dynamoService.queryAllByDateRange(from, to);
  }

  const periodGranularity = period as PeriodGranularity;

  const aggregated: AggregatedMetrics = {
    query,
    totalPRs: metrics.length,
    byPeriod: bucketMetrics(metrics, fromDate, toDate, periodGranularity),
    byEngineer: groupAndBucket(
      metrics,
      (m) => m.author,
      fromDate,
      toDate,
      periodGranularity
    ),
    byTeam: groupAndBucket(
      metrics,
      (m) => m.team,
      fromDate,
      toDate,
      periodGranularity
    ),
  };

  res.json(aggregated);
});

export default router;
