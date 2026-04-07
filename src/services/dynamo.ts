import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { PullRequestMetric } from "../types";

export class DynamoService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
      region: config.dynamodb.region,
    };

    if (config.dynamodb.endpoint) {
      clientConfig.endpoint = config.dynamodb.endpoint;
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = config.dynamodb.tableName;
  }

  async storePullRequest(metric: PullRequestMetric): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: metric,
      })
    );
  }

  async storePullRequests(metrics: PullRequestMetric[]): Promise<void> {
    // BatchWrite has a 25-item limit; process in chunks
    const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
    const chunks = this.chunk(metrics, 25);

    for (const batch of chunks) {
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map((item) => ({
              PutRequest: { Item: item },
            })),
          },
        })
      );
    }
  }

  async queryByTeamAndDateRange(
    team: string,
    from: string,
    to: string
  ): Promise<PullRequestMetric[]> {
    const items: PullRequestMetric[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "gsi-team-date",
          KeyConditionExpression:
            "team = :team AND dateOpened BETWEEN :from AND :to",
          ExpressionAttributeValues: {
            ":team": team,
            ":from": from,
            ":to": to,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((result.Items as PullRequestMetric[]) ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  async queryByAuthorAndDateRange(
    author: string,
    from: string,
    to: string
  ): Promise<PullRequestMetric[]> {
    const items: PullRequestMetric[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "gsi-author-date",
          KeyConditionExpression:
            "author = :author AND dateOpened BETWEEN :from AND :to",
          ExpressionAttributeValues: {
            ":author": author,
            ":from": from,
            ":to": to,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((result.Items as PullRequestMetric[]) ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  async queryAllByDateRange(
    from: string,
    to: string
  ): Promise<PullRequestMetric[]> {
    const items: PullRequestMetric[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "gsi-all-date",
          KeyConditionExpression:
            "allPrs = :all AND dateOpened BETWEEN :from AND :to",
          ExpressionAttributeValues: {
            ":all": "ALL",
            ":from": from,
            ":to": to,
          },
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      items.push(...((result.Items as PullRequestMetric[]) ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
