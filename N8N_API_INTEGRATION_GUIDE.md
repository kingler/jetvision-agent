# n8n API Integration Guide for JetVision Agent

## Overview
This guide explains how to configure n8n to work with the JetVision Agent's dynamic execution progress tracking using the n8n API.

## Features
- **Real-time Progress Tracking**: Monitor workflow execution progress
- **Dynamic Status Updates**: Stream status updates to the frontend
- **Execution Data Retrieval**: Get complete workflow results via API
- **Fallback Support**: Works with or without API configuration

## Configuration Steps

### 1. Enable n8n API
In your n8n instance, enable the REST API:

```bash
# Docker Compose Configuration
environment:
  - N8N_API_ENABLED=true
  - N8N_API_PREFIX=/api/v1
  - N8N_API_KEY=your-secure-api-key-here
```

### 2. Configure Webhook Response
Update your n8n webhook node to return the execution ID:

#### Option A: Using Code Node (Recommended)
Add a Code node after your webhook trigger:

```javascript
// Code Node: Return Execution ID
return [{
  json: {
    ...items[0].json,
    executionId: $execution.id,
    workflowId: $workflow.id,
    timestamp: new Date().toISOString()
  }
}];
```

#### Option B: Using Set Node
Add a Set node with these fields:
- `executionId`: `{{$execution.id}}`
- `workflowId`: `{{$workflow.id}}`
- Keep existing fields: Yes

### 3. Environment Variables
Configure these environment variables in your JetVision Agent:

```env
# Required for API integration
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=your-n8n-api-key

# Webhook URL (existing)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/jetvision-agent

# Optional: Adjust polling interval (default: 60000ms)
N8N_TIMEOUT=60000
```

### 4. Update Workflow Structure
Ensure your n8n workflow has these key nodes:

```
1. Webhook (Trigger)
   ├── Method: POST
   └── Response Mode: "When Last Node Finishes"

2. Prepare Data (Set/Code Node)
   ├── Add executionId
   └── Format input data

3. JetVision Agent (AI Agent Node)
   ├── Process request
   └── Generate response

4. Format Response (Code Node)
   ├── Structure: { response, executionId, sources, metadata }
   └── Ensure text field exists

5. Respond to Webhook (Final Node)
   └── Returns formatted response
```

## How It Works

### Execution Flow with API:
1. **Frontend sends request** → n8n webhook
2. **Webhook returns execution ID** immediately
3. **Frontend polls n8n API** for execution status
4. **Progress updates stream** to UI in real-time
5. **On completion**, full response retrieved via API
6. **Response displayed** in Thread UI

### Execution Flow without API (Fallback):
1. **Frontend sends request** → n8n webhook
2. **Waits for webhook response** (synchronous)
3. **Response displayed** when workflow completes

## API Endpoints Used

### Get Execution Status
```http
GET /api/v1/executions/{executionId}
X-N8N-API-KEY: your-api-key
```

Response:
```json
{
  "id": "123",
  "finished": false,
  "status": "running",
  "startedAt": "2024-01-01T00:00:00Z",
  "workflowId": "abc"
}
```

### Get Execution Data
When `finished: true`, retrieve complete data:
```json
{
  "data": {
    "resultData": {
      "runData": {
        "Agent": [{
          "data": {
            "main": [[{
              "json": {
                "response": "Agent response text here"
              }
            }]]
          }
        }]
      }
    }
  }
}
```

## Status Messages
The frontend displays these progress updates:

1. **"Connecting to n8n workflow..."** - Initial connection
2. **"Workflow is running..."** - Execution started
3. **"Workflow success..."** - Completed successfully
4. **Progress percentage** - Visual progress bar

## Troubleshooting

### No Execution ID Returned
- Ensure Code/Set node adds `executionId: {{$execution.id}}`
- Check webhook response mode is "When Last Node Finishes"
- Verify n8n API is enabled

### API Authentication Fails
- Verify API key is correct
- Check API endpoint URL includes `/api/v1`
- Ensure n8n API is enabled in config

### Polling Timeout
- Default timeout is 60 seconds
- Adjust `N8N_TIMEOUT` environment variable if needed
- Check workflow execution time

### Response Not Found
The system looks for response in these fields (in order):
1. `response`
2. `message`
3. `text`
4. `output`
5. Any node with these fields

Ensure your final node outputs one of these fields.

## Benefits

### With API Integration:
- ✅ Real-time progress updates
- ✅ Better error handling
- ✅ Execution history tracking
- ✅ Detailed debugging information
- ✅ Async workflow support

### Without API (Fallback):
- ✅ Still works with basic webhook
- ✅ Simpler configuration
- ⚠️ No progress updates
- ⚠️ Synchronous only

## Example n8n Workflow JSON

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "jetvision-agent",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Add Execution ID",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return [{\n  json: {\n    ...items[0].json,\n    executionId: $execution.id\n  }\n}];"
      }
    },
    {
      "name": "Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "prompt": "={{$json.message}}"
      }
    },
    {
      "name": "Format Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return [{\n  json: {\n    response: items[0].json.output || items[0].json.text,\n    executionId: items[0].json.executionId,\n    timestamp: new Date().toISOString()\n  }\n}];"
      }
    }
  ]
}
```

## Testing

### Test API Connection:
```bash
curl -X GET https://your-n8n.com/api/v1/executions \
  -H "X-N8N-API-KEY: your-api-key"
```

### Test Webhook with Progress:
```bash
curl -X POST http://localhost:3000/api/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message",
    "threadId": "test-123",
    "threadItemId": "item-456"
  }'
```

Watch the console for progress updates!