import { RepositoryConfig } from "./types";

export const config = {
  bitbucket: {
    baseUrl: process.env.BITBUCKET_BASE_URL || "",
    token: process.env.BITBUCKET_TOKEN || "",
  },
  github: {
    baseUrl: process.env.GITHUB_BASE_URL || "https://api.github.com",
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
 * Configure the projects/orgs to track here.
 * All repos within the project/org are included by default.
 * Use `exclude` to skip specific repo slugs.
 */
export const repositories: RepositoryConfig[] = [
  // Bitbucket Server — all repos in RCSBOM except dbom-akkaservice:
  // { source: "bitbucket", project: "RCSBOM", team: "DBOM", exclude: ["dbom-akkaservice"] },

  // GitHub (github.com) — all repos in the org:
  // { source: "github", project: "bct-adidas", team: "BCT" },
];
