/**
 * AWS Lambda Function: BranchFlow Nightly Backlog Cleanup
 * 
 * Trigger: Amazon EventBridge (CloudWatch Events) Rule (e.g. cron(0 0 * * ? *) every night at midnight UTC)
 * Target Table: BranchFlowTasks (DynamoDB)
 * Region: ap-southeast-2
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE_NAME = process.env.DYNAMO_TABLE || 'BranchFlowTasks';

const rawClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(rawClient);

exports.handler = async (event, context) => {
  const startTime = Date.now();
  console.log(`[Lambda Cleanup] Initiated nightly purge for table: ${TABLE_NAME} in ${REGION}`);
  console.log(`[Lambda Cleanup] Event payload:`, JSON.stringify(event));

  try {
    // 1. Scan DynamoDB table for completed tasks
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#comp = :isComp',
      ExpressionAttributeNames: {
        '#comp': 'completed'
      },
      ExpressionAttributeValues: {
        ':isComp': true
      }
    });

    const scanResult = await docClient.send(scanCommand);
    const completedTasks = scanResult.Items || [];
    console.log(`[Lambda Cleanup] Found ${completedTasks.length} completed tasks scheduled for deletion`);

    const deletedIds = [];

    // 2. Delete each completed task
    for (const task of completedTasks) {
      const deleteCommand = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          id: String(task.id)
        }
      });

      await docClient.send(deleteCommand);
      deletedIds.push(task.id);
      console.log(`[Lambda Cleanup] Purged completed task id: ${task.id} (${task.text})`);
    }

    const durationMs = Date.now() - startTime;
    const responsePayload = {
      success: true,
      message: `Nightly cleanup completed. Purged ${deletedIds.length} completed task(s).`,
      deletedCount: deletedIds.length,
      deletedIds: deletedIds,
      tableName: TABLE_NAME,
      region: REGION,
      executionDurationMs: durationMs,
      timestamp: new Date().toISOString()
    };

    console.log(`[Lambda Cleanup] Execution finished successfully in ${durationMs}ms`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responsePayload)
    };
  } catch (err) {
    console.error(`[Lambda Cleanup ERROR] Failed to delete completed tasks:`, err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
