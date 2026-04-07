import { RepositoryConfig } from "./types";

export const config = {
  bitbucket: {
    baseUrl: process.env.BITBUCKET_BASE_URL || "",
    token: process.env.BITBUCKET_TOKEN || "",
  },
  github: {
    baseUrl: process.env.GITHUB_BASE_URL || "",
    token: process.env.GITHUB_TOKEN || "",
  },
  dynamodb: {
    region: process.env.AWS_REGION || "us-east-1",
    tableName: process.env.DYNAMODB_TABLE_NAME || "pr-metrics",
    endpoint: process.env.DYNAMODB_ENDPOINT,
  },
  port: parseInt(process.env.PORT || "3000", 10),
};

/**
 * Configure the repositories to track here.
 * Team is derived from the project key (Bitbucket) or org (GitHub).
 */
export const repositories: RepositoryConfig[] = [
  // Bitbucket Server examples:
  // { source: "bitbucket", project: "RCSBOM", slug: "dbom-akkaservice" },
  // { source: "bitbucket", project: "RCSBOM", slug: "dbom-frontend" },

  // GitHub Enterprise examples:
  // { source: "github", project: "my-org", slug: "my-repo" },
];
