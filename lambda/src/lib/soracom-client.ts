import axios, { AxiosInstance } from 'axios';
import { ISoracomClient } from '../soracom-stats-monitor';

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Stats } from './stats';
import { group } from 'console';

interface SoracomCredential {
  operatorId?: string;
  authKeyId?: string;
  authKey?: string;
  apiKey?: string;
  apiToken?: string;
  coverageType?: string;
}

export class SoracomClient implements ISoracomClient {
  private secretId: string;
  private soracomCredential: SoracomCredential;
  private readonly client: AxiosInstance;

  constructor() {
    this.soracomCredential = {};
    this.client = axios.create();
    this.client.interceptors.request.use(async (config) => {
      await this.auth();
      config.headers['X-Soracom-API-Key'] = this.soracomCredential.apiKey;
      config.headers['X-Soracom-Token'] = this.soracomCredential.apiToken;
      return config;
    });
  }

  private getBaseUrl(): string {
    return this.soracomCredential.coverageType === 'g' ? 'https://g.api.soracom.io/v1' : 'https://api.soracom.io/v1';
  }

  private async auth(): Promise<void> {
    if (!this.soracomCredential.apiKey || !this.soracomCredential.apiToken) {
      const response = await axios.post(`${this.getBaseUrl()}/auth`, {
        authKeyId: this.soracomCredential.authKeyId,
        authKey: this.soracomCredential.authKey,
      });
      if (response.status !== 200) throw new Error(`Failed to authenticate: ${response.status}`);

      this.soracomCredential.apiKey = response.data.apiKey;
      this.soracomCredential.apiToken = response.data.token;

      return;
    } else {
      return;
    }
  }

  async initWithSecretId(secretId: string): Promise<void> {
    this.secretId = secretId;

    const client = new SecretsManagerClient({});
    const command = new GetSecretValueCommand({ SecretId: this.secretId });
    const response = await client.send(command).catch((err) => {
      // For a list of exceptions thrown, see
      // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
      throw err;
    });

    const data = JSON.parse(response.SecretString!);
    this.soracomCredential = {
      operatorId: data.operatorId,
      authKeyId: data.authKeyId,
      authKey: data.authKey,
      coverageType: data.coverageType,
    };
  }

  async getOperatorStats(from: number, to: number): Promise<Stats[]> {
    const url = `${this.getBaseUrl()}/stats/air/operators/${this.soracomCredential.operatorId}`;
    const response = await this.client
      .get(url, {
        params: {
          from,
          to,
          period: 'day',
        },
      })
      .catch((err) => {
        throw err;
      });
    const stats: Stats[] = [];
    response.data.forEach((stat: any) => {
      stats.push(
        Stats.build(
          this.soracomCredential.operatorId!,
          this.soracomCredential.coverageType!,
          stat.unixtime,
          'uploadByteSizeTotal',
          stat.uploadByteSizeTotal,
        ),
      );

      stats.push(
        Stats.build(
          this.soracomCredential.operatorId!,
          this.soracomCredential.coverageType!,
          stat.unixtime,
          'downloadByteSizeTotal',
          stat.downloadByteSizeTotal,
        ),
      );
    });
    return stats;
  }

  async listGroups(): Promise<string[]> {
    const url = `${this.getBaseUrl()}/groups`;
    const response = await this.client.get(url).catch((err) => {
      throw err;
    });
    const groupIds: string[] = [];
    response.data.forEach((group: any) => {
      groupIds.push(group.groupId);
    });
    return groupIds;
  }

  async getGroupStats(groupId: string, from: number, to: number): Promise<Stats[]> {
    const url = `${this.getBaseUrl()}/stats/air/groups/${groupId}`;
    const response = await this.client
      .get(url, {
        params: {
          from,
          to,
          period: 'day',
        },
      })
      .catch((err) => {
        throw err;
      });
    const stats: Stats[] = [];
    response.data.forEach((stat: any) => {
      stats.push(
        Stats.build(
          this.soracomCredential.operatorId!,
          this.soracomCredential.coverageType!,
          stat.unixtime,
          'uploadByteSizeTotal',
          stat.uploadByteSizeTotal,
          groupId,
        ),
      );

      stats.push(
        Stats.build(
          this.soracomCredential.operatorId!,
          this.soracomCredential.coverageType!,
          stat.unixtime,
          'downloadByteSizeTotal',
          stat.downloadByteSizeTotal,
          groupId,
        ),
      );
    });
    return stats;
  }

  async getAllGroupStats(from: number, to: number): Promise<Stats[]> {
    const stats: Stats[] = [];
    const groupIds = await this.listGroups();

    await Promise.all(
      groupIds.map((groupId) => {
        return this.getGroupStats(groupId, from, to).then((groupStats) => {
          stats.push(...groupStats);
        });
      }),
    );
    return stats;
  }

  async getStats(): Promise<Stats[]> {
    const stats: Stats[] = [];
    const unixTimeNow = Math.floor(Date.now() / 1000);
    const unixTime7daysAgo = unixTimeNow - 2 * 24 * 60 * 60;
    const operatorStats = await this.getOperatorStats(unixTime7daysAgo, unixTimeNow);
    const groupStats = await this.getAllGroupStats(unixTime7daysAgo, unixTimeNow);
    stats.push(...operatorStats, ...groupStats);
    console.log(stats);
    return stats;
  }
}
