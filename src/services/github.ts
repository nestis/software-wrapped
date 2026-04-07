import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { PullRequestMetric } from "../types";

interface GitHubPR {
  number: number;
  created_at: string;
  additions: number;
  deletions: number;
  user: {
    login: string;
  };
}

interface GitHubPRListItem {
  number: number;
  created_at: string;
  user: {
    login: string;
  } | null;
}

export class GitHubService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.github.baseUrl,
      headers: {
        Authorization: `token ${config.github.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
  }

  async fetchPullRequests(
    org: string,
    repo: string,
    from: Date,
    to: Date
  ): Promise<PullRequestMetric[]> {
    const metrics: PullRequestMetric[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.get<GitHubPRListItem[]>(
        `/repos/${org}/${repo}/pulls`,
        {
          params: {
            state: "all",
            sort: "created",
            direction: "desc",
            per_page: 30,
            page,
          },
        }
      );

      const prs = response.data;

      if (prs.length === 0) {
        hasMore = false;
        break;
      }

      for (const pr of prs) {
        const createdDate = new Date(pr.created_at);

        if (createdDate < from) {
          hasMore = false;
          break;
        }

        if (createdDate >= from && createdDate <= to) {
          const detail = await this.fetchPRDetail(org, repo, pr.number);
          const repository = `${org}/${repo}`;

          metrics.push({
            pk: `github#${repository}`,
            sk: `PR#${pr.number}`,
            prId: String(pr.number),
            dateOpened: createdDate.toISOString(),
            size: detail.additions + detail.deletions,
            author: pr.user?.login ?? "unknown",
            team: org,
            source: "github",
            repository,
            allPrs: "ALL",
          });
        }
      }

      page++;
    }

    return metrics;
  }

  private async fetchPRDetail(
    org: string,
    repo: string,
    prNumber: number
  ): Promise<{ additions: number; deletions: number }> {
    const response = await this.client.get<GitHubPR>(
      `/repos/${org}/${repo}/pulls/${prNumber}`
    );
    return {
      additions: response.data.additions,
      deletions: response.data.deletions,
    };
  }
}
