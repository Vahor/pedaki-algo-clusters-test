const {
    CloudFormation
} = require("@aws-sdk/client-cloudformation");
const fs = require('fs');

console.log(process.env.AWS_PROFILE);
const cloudFormation = new CloudFormation();

const templateFilePath = '../architecture/cdk.out/ArchitectureStack.template.json';

async function main() {
    try {
        const organizationId = 'org-1';
        const stackName = `ArchitectureStack-${organizationId}`
        // Check if the stack exists
        const describeStacksParams = {
            StackName: stackName
        };
        const templateBody = fs.readFileSync(templateFilePath, 'utf-8');

        const createStackParams = {
            StackName: stackName,
            TemplateBody: templateBody,
            // Add any other necessary parameters for your CDK stack
            Parameters: [{
                ParameterKey: 'OrganizationIdParam',
                ParameterValue: organizationId,
            },
                {
                    ParameterKey: 'InstanceTypeParam',
                    ParameterValue: 't2.micro',
                }
            ],
            Capabilities: ['CAPABILITY_IAM']
        };

        console.log(describeStacksParams)
        cloudFormation.describeStacks(describeStacksParams)
            .then(async (data) => {
                console.log("delete");
                await cloudFormation.deleteStack(describeStacksParams).then((data) => {
                    console.log(data);
                }).catch((err) => {
                    console.error(err);
                });
            })
            .catch(async (err) => {
                // Deploy the stack with the local template file
                await cloudFormation.createStack(createStackParams).then((data) => {
                    console.log(data);
                }).catch((err) => {
                    console.error(err);
                });
            });


    } catch (err) {
        console.error(err);
    }
}

main();