import { Router, Request, Response } from "express";
import { repositories } from "../config";
import { BitbucketService } from "../services/bitbucket";
import { GitHubService } from "../services/github";
import { DynamoService } from "../services/dynamo";
import { FetchRequest, PullRequestMetric } from "../types";

const router = Router();
const bitbucketService = new BitbucketService();
const githubService = new GitHubService();
const dynamoService = new DynamoService();

/**
 * POST /api/fetch
 * Body: { from: "2024-01-01", to: "2024-06-30" }
 *
 * Fetches PRs from all configured repositories within the date range
 * and stores them in DynamoDB.
 */
router.post("/", async (req: Request, res: Response) => {
  const { from, to } = req.body as FetchRequest;

  if (!from || !to) {
    res.status(400).json({ error: "Both 'from' and 'to' dates are required (ISO 8601)" });
    return;
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use ISO 8601 (e.g., 2024-01-01)" });
    return;
  }

  if (fromDate >= toDate) {
    res.status(400).json({ error: "'from' must be before 'to'" });
    return;
  }

  const allMetrics: PullRequestMetric[] = [];
  const errors: Array<{ repository: string; error: string }> = [];

  const fetchPromises = repositories.map(async (repo) => {
    try {
      let metrics: PullRequestMetric[];

      if (repo.source === "bitbucket") {
        metrics = await bitbucketService.fetchPullRequests(
          repo.project,
          repo.slug,
          fromDate,
          toDate
        );
      } else {
        metrics = await githubService.fetchPullRequests(
          repo.project,
          repo.slug,
          fromDate,
          toDate
        );
      }

      if (metrics.length > 0) {
        await dynamoService.storePullRequests(metrics);
      }

      allMetrics.push(...metrics);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        repository: `${repo.source}/${repo.project}/${repo.slug}`,
        error: message,
      });
    }
  });

  await Promise.all(fetchPromises);

  res.json({
    fetched: allMetrics.length,
    repositories: repositories.length,
    errors: errors.length > 0 ? errors : undefined,
    dateRange: { from, to },
  });
});

export default router;
