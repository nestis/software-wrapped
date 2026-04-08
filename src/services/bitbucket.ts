import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { PullRequestMetric } from "../types";

interface BitbucketPR {
  id: number;
  createdDate: number; // epoch millis
  author: {
    user: {
      slug: string;
      displayName: string;
    };
  };
  properties?: {
    mergeResult?: {
      outcome?: string;
    };
  };
}

interface BitbucketDiffStat {
  values: Array<{
    linesAdded?: number;
    linesRemoved?: number;
  }>;
  isLastPage: boolean;
  nextPageStart?: number;
}

interface BitbucketPagedResponse<T> {
  values: T[];
  isLastPage: boolean;
  nextPageStart?: number;
  size: number;
}

interface BitbucketRepo {
  slug: string;
  name: string;
}

export class BitbucketService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.bitbucket.baseUrl,
      headers: {
        Authorization: `Bearer ${config.bitbucket.token}`,
        Accept: "application/json",
      },
    });
  }

  async listRepositories(project: string): Promise<string[]> {
    const slugs: string[] = [];
    let start = 0;
    let isLastPage = false;

    while (!isLastPage) {
      const response = await this.client.get<BitbucketPagedResponse<BitbucketRepo>>(
        `/rest/api/1.0/projects/${project}/repos`,
        { params: { start, limit: 25 } }
      );

      const page = response.data;
      for (const repo of page.values) {
        slugs.push(repo.slug);
      }

      isLastPage = page.isLastPage;
      start = page.nextPageStart ?? start + 25;
    }

    return slugs;
  }

  async fetchPullRequests(
    project: string,
    slug: string,
    team: string,
    from: Date,
    to: Date
  ): Promise<PullRequestMetric[]> {
    const metrics: PullRequestMetric[] = [];
    let start = 0;
    let isLastPage = false;

    while (!isLastPage) {
      const response = await this.client.get<BitbucketPagedResponse<BitbucketPR>>(
        `/rest/api/1.0/projects/${project}/repos/${slug}/pull-requests`,
        {
          params: {
            state: "ALL",
            start,
            limit: 25,
            order: "NEWEST",
          },
        }
      );

      const page = response.data;

      for (const pr of page.values) {
        const createdDate = new Date(pr.createdDate);

        // Stop paginating if we've gone past our date range
        if (createdDate < from) {
          isLastPage = true;
          break;
        }

        if (createdDate >= from && createdDate <= to) {
          const size = await this.fetchPRSize(project, slug, pr.id);
          const repository = `${project}/${slug}`;

          metrics.push({
            pk: `bitbucket#${repository}`,
            sk: `PR#${pr.id}`,
            prId: String(pr.id),
            dateOpened: createdDate.toISOString(),
            size,
            author: pr.author.user.displayName || pr.author.user.slug,
            team,
            source: "bitbucket",
            repository,
            allPrs: "ALL",
          });
        }
      }

      isLastPage = isLastPage || page.isLastPage;
      start = page.nextPageStart ?? start + 25;
    }

    return metrics;
  }

  private async fetchPRSize(
    project: string,
    slug: string,
    prId: number
  ): Promise<number> {
    let totalAdded = 0;
    let totalRemoved = 0;
    let start = 0;
    let isLastPage = false;

    while (!isLastPage) {
      const response = await this.client.get<BitbucketDiffStat>(
        `/rest/api/1.0/projects/${project}/repos/${slug}/pull-requests/${prId}/diff`,
        {
          params: { start, limit: 100, withComments: false },
        }
      );

      const data = response.data;
      for (const file of data.values) {
        totalAdded += file.linesAdded ?? 0;
        totalRemoved += file.linesRemoved ?? 0;
      }

      isLastPage = data.isLastPage;
      start = data.nextPageStart ?? start + 100;
    }

    return totalAdded + totalRemoved;
  }
}
