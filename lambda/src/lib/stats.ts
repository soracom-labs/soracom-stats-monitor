export class Stats {
  key: string;
  unixtimeInSeconds: number;
  statsName: string;
  value: number;

  constructor(key: string, timestamp: number, statsName: string, value: number) {
    this.key = key;
    this.unixtimeInSeconds = timestamp;
    this.statsName = statsName;
    this.value = value;
  }

  static build(
    operatorId: string,
    coverageType: string,
    timestamp: number,
    statsName: string,
    value: number,
    grouppId?: string,
  ): Stats {
    return new Stats([operatorId, coverageType, grouppId].filter((v) => v).join('-'), timestamp, statsName, value);
  }

  buildFromAirStats(operatorId: string, coverageType: string, timestamp: number, statsName: string, value: number) {}
}
