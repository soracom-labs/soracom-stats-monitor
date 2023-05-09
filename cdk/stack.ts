import { App, Duration, Stack } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { join } from 'path';

export class SoracomStatsMonitorStack extends Stack {
  constructor(app: App, id: string, props?: any) {
    super(app, id);

    const secretsManager = new Secret(this, 'SoracomStatsMonitro-SoracomCredential');

    const nodeJsFunctionProps: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(180),
      environment: {
        SECRET_ID: secretsManager.secretName,
      },
    };

    const soracomStatsMonitorLambda = new NodejsFunction(this, 'SoracomStatsMonitorLambda', {
      entry: join(__dirname, '../lambda', 'src', 'soracom-stats-monitor.ts'),
      ...nodeJsFunctionProps,
    });

    const cloudwatchPutMetricsPolicy = new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    });
    soracomStatsMonitorLambda.role?.attachInlinePolicy(
      new Policy(this, 'SoracomStatsMonitorLambdaCloudwatchPutMetricsPolicy', {
        statements: [cloudwatchPutMetricsPolicy],
      }),
    );

    secretsManager.grantRead(soracomStatsMonitorLambda);

    const rule = new Rule(this, 'SoracomStatsMonitorRule', {
      schedule: Schedule.expression('cron(5 0 * * ? *)'),
    });

    rule.addTarget(new LambdaFunction(soracomStatsMonitorLambda));
  }
}
