import { CloudwatchClient } from './lib/cloudwatch-client';
import { SoracomClient } from './lib/soracom-client';
import { Stats } from './lib/stats';

const SECRET_ID = process.env.SECRET_ID!;

export interface ISoracomClient {
  initWithSecretId(secretId: string): Promise<void>;
  getStats(): Promise<Stats[]>;
}

export interface ICloudDataStoreClient {
  saveStats(stats: Stats[]): Promise<void>;
}

export const handler = async (event: any): Promise<any> => {
  const soracomClient = new SoracomClient();
  await soracomClient.initWithSecretId(SECRET_ID);
  const stats = await soracomClient.getStats();

  const cloudwatchClient = new CloudwatchClient();
  await cloudwatchClient.saveStats(stats);

  return;
};
