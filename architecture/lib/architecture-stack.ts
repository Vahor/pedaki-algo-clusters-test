import * as cdk from 'aws-cdk-lib';
import {CfnParameter} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Vpc} from "aws-cdk-lib/aws-ec2";

export class ArchitectureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const instanceTypeParam = new CfnParameter(this, 'InstanceTypeParam', {
            type: 'String',
            default: 't2.micro',
            description: 'EC2 instance types',
        });

        const organizationIdParam = new CfnParameter(this, 'OrganizationIdParam', {
            type: 'String',
            description: 'Organization ID',
        });

        const organizationId = organizationIdParam.valueAsString;
        const instanceType = instanceTypeParam.valueAsString;

        // Create vpc
        const vpc = new Vpc(this, 'vpc', {
            maxAzs: 2,
            vpcName: `${organizationId}-vpc`,
        });

        // Create security group
        const securityGroup = new cdk.aws_ec2.SecurityGroup(this, 'securityGroup', {
            vpc,
            securityGroupName: `${organizationId}-security-group`,
            allowAllOutbound: true,
        });

        securityGroup.addIngressRule(cdk.aws_ec2.Peer.anyIpv4(), cdk.aws_ec2.Port.tcp(80), 'allow http access from anywhere');

        // Create ec2 instance
        const ec2Instance = new cdk.aws_ec2.Instance(this, 'ec2Instance', {
            instanceName: `${organizationId}-ec2-instance`,
            vpc,
            securityGroup,
            instanceType: new cdk.aws_ec2.InstanceType(instanceType),
            machineImage: new cdk.aws_ec2.AmazonLinuxImage(),
        });


        // Create output
        new cdk.CfnOutput(this, 'ec2InstanceId', {
            value: ec2Instance.instanceId,
        });
        new cdk.CfnOutput(this, 'ec2InstancePublicIp', {
            value: ec2Instance.instancePublicIp,
        });
    }
}
