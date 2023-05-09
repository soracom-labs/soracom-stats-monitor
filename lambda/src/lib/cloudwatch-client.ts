import { ICloudDataStoreClient } from '../soracom-stats-monitor';
import { Stats } from './stats';
import { CloudWatchClient, PutMetricDataCommandInput, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export class CloudwatchClient implements ICloudDataStoreClient {
  private cloudwatchClient: CloudWatchClient;

  constructor() {
    this.cloudwatchClient = new CloudWatchClient({});
  }

  async saveStats(stats: Stats[]): Promise<void> {
    const params: PutMetricDataCommandInput = {
      Namespace: 'SORACOM/AIR',
      MetricData: stats.map((stat) => ({
        MetricName: stat.statsName,
        Dimensions: [
          {
            Name: 'stats',
            Value: stat.key,
          },
        ],
        Timestamp: new Date(stat.unixtimeInSeconds * 1000),
        Value: stat.value,
        Unit: 'Bytes',
      })),
    };

    const command = new PutMetricDataCommand(params);
    await this.cloudwatchClient.send(command);
  }
}
