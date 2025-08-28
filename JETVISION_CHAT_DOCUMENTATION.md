# JetVision Chat Interface Documentation

## Overview
The JetVision Chat Interface is a sophisticated, AI-powered chat system that integrates Apollo.io lead generation with Avinode fleet management through n8n webhook automation. It provides stakeholders with an intuitive interface to query and manage both systems seamlessly.

## Features

### 1. Predefined Prompt Cards
- **Apollo.io Intelligence**: 5 pre-configured prompts for lead generation and campaign management
- **Avinode Operations**: 4 prompts for aircraft availability and fleet management  
- **System Integration**: 3 prompts for cross-platform operations and automation

### 2. Interactive Chat Interface
- **Smart Input Field**: Auto-populates with selected prompts, fully editable
- **Visual Feedback**: Animated transitions and loading states
- **Keyboard Shortcuts**: 
  - `⌘/Ctrl + K`: Toggle prompt cards visibility
  - `⌘/Ctrl + Enter`: Submit query

### 3. Results Panel
- **Right-side sliding panel**: Displays search results with smooth animations
- **Result types**: Contacts, Aircraft, Campaigns, Flights
- **Metadata display**: Shows relevant information for each result type
- **Match scoring**: Visual representation of result relevance

### 4. n8n Webhook Integration
- **Automatic routing**: Detects query type (Apollo/Avinode/Integration)
- **Real-time processing**: Sends prompts to n8n workflows
- **Error handling**: Graceful error messages and retry capabilities
- **Session tracking**: Maintains context across queries

## File Structure

```
/llmchat/packages/common/
├── components/jetvision/
│   ├── JetVisionChat.tsx          # Main chat interface component
│   ├── PromptCards.tsx            # Predefined prompt cards grid
│   ├── SearchResultsPanel.tsx     # Results display panel
│   ├── ExecutiveProfileCard.tsx   # Apollo contact display
│   ├── FlightQuoteCard.tsx        # Avinode flight display
│   ├── CampaignMetricsPanel.tsx   # Campaign analytics
│   └── index.ts                   # Component exports
│
├── services/
│   └── n8n-webhook.service.ts     # n8n webhook integration
│
/apps/web/app/jetvision/
├── page.tsx                       # JetVision page component
└── layout.tsx                     # Page layout and metadata
```

## Configuration

### Environment Variables
Create a `.env.local` file based on `.env.jetvision.example`:

```env
# n8n Webhook URL (required)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n.com/webhook/jetvision-agent

# Optional API Key for authentication
NEXT_PUBLIC_N8N_API_KEY=your-api-key

# Apollo.io and Avinode configurations
APOLLO_API_KEY=xxx
AVINODE_API_KEY=xxx
```

### n8n Webhook Setup

1. **Create Webhook Node** in n8n:
   - Type: Webhook
   - HTTP Method: POST
   - Path: `/jetvision-agent`
   - Authentication: Optional (Bearer Token)

2. **Expected Request Format**:
```json
{
  "prompt": "User's question",
  "context": {
    "userId": "user-123",
    "sessionId": "session-xxx",
    "timestamp": "2024-01-20T10:00:00Z",
    "source": "apollo|avinode|integration"
  },
  "parameters": {}
}
```

3. **Expected Response Format**:
```json
{
  "success": true,
  "results": [
    {
      "id": "result-1",
      "type": "contact|aircraft|campaign|flight",
      "title": "Result Title",
      "subtitle": "Result Description",
      "metadata": {},
      "score": 85
    }
  ],
  "executionId": "exec-123",
  "workflowId": "workflow-456",
  "processingTime": 1234
}
```

## Usage

### Access the Interface
Navigate to `/jetvision` in your application to access the JetVision chat interface.

### Workflow

1. **Select or Type Query**:
   - Click a prompt card to auto-populate the input
   - Or type your own query directly

2. **Edit if Needed**:
   - Modify the populated prompt as required
   - Use natural language for best results

3. **Submit Query**:
   - Click send button or press `⌘/Ctrl + Enter`
   - Loading indicator shows processing status

4. **View Results**:
   - Results panel slides in from the right
   - Click results for detailed views
   - Use refresh button to re-run queries

### Example Queries

**Apollo.io**:
- "Find executive assistants at Fortune 500 companies in California"
- "Show conversion rates for jet charter campaigns this month"
- "Launch campaign for Series B funded companies"

**Avinode**:
- "Check Gulfstream G650 availability NYC to London next week"
- "Find empty leg flights Miami to New York"
- "Show fleet status and locations"

**Integration**:
- "Sync high-value Apollo leads with Avinode bookings"
- "Check system health and API connections"
- "Show active n8n workflows"

## Styling

The interface maintains consistency with the llmchat base application:
- Uses existing UI components from `@repo/ui`
- Follows established color scheme with JetVision branding
- Responsive design for desktop and mobile
- Dark mode support

## Advanced Features

### Custom Result Handlers
Implement custom handlers for different result types:

```typescript
const handleResultSelect = (result: SearchResult) => {
  switch(result.type) {
    case 'contact':
      // Open contact details modal
      break;
    case 'aircraft':
      // Show aircraft specifications
      break;
    case 'campaign':
      // Display campaign analytics
      break;
  }
};
```

### Stream Support
For real-time updates, use the streaming endpoint:

```typescript
const cleanup = await n8nWebhook.streamPrompt(
  request,
  (data) => console.log('Received:', data),
  (error) => console.error('Error:', error),
  () => console.log('Stream complete')
);
```

## Troubleshooting

### Common Issues

1. **Webhook Not Responding**:
   - Verify n8n webhook URL is correct
   - Check n8n workflow is active
   - Ensure proper CORS configuration

2. **No Results Displayed**:
   - Verify response format matches expected structure
   - Check browser console for errors
   - Ensure proper data transformation

3. **Authentication Errors**:
   - Verify API key is set correctly
   - Check n8n webhook authentication settings
   - Ensure bearer token format is correct

## Performance Optimization

- **Debounced Input**: Prevents excessive API calls
- **Result Caching**: Session-based result caching
- **Lazy Loading**: Components load on demand
- **Virtual Scrolling**: For large result sets

## Security Considerations

- **API Key Storage**: Use environment variables
- **Session Management**: Unique session IDs per user
- **Input Sanitization**: Prevents XSS attacks
- **Rate Limiting**: Implement at n8n webhook level

## Future Enhancements

- [ ] Voice input support
- [ ] Export results to CSV/PDF
- [ ] Advanced filtering options
- [ ] Real-time collaboration features
- [ ] Mobile app integration
- [ ] Offline mode with local caching

## Support

For issues or questions:
- Check the troubleshooting section
- Review n8n workflow logs
- Contact JetVision technical support

---

*Last Updated: January 2024*
*Version: 1.0.0*