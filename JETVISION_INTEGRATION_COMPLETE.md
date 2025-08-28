# JetVision Agent Integration - Complete Implementation Guide

## 🚀 Overview

JetVision Agent is now the primary chat interface for the LLMChat application, fully integrated with n8n workflows to handle all chat responses through Apollo.io and Avinode operations instead of traditional LLM providers.

## ✅ What Has Been Implemented

### 1. **n8n Agent Provider System**
- **Location**: `/packages/ai/providers/n8n-provider.ts`
- **Functionality**: 
  - Custom LanguageModelV1 implementation that routes to n8n webhooks
  - Automatic source detection (Apollo/Avinode/Integration)
  - Response formatting for chat interface
  - Streaming support for real-time responses

### 2. **JetVision as Default Model**
- **Model Configuration**: Added `JETVISION_AGENT` as primary model
- **Provider Integration**: n8n-agent provider handles all chat completions
- **Store Configuration**: Chat store defaults to JetVision Agent model
- **Custom Instructions**: Pre-configured for Apollo.io and Avinode expertise

### 3. **Branded Chat Interface**
- **Main Page**: `/app/chat/page.tsx`
  - JetVision welcome header with aviation branding
  - Prompt cards grid for quick access
  - Automatic prompt population in chat input
  - Smooth animations and transitions

### 4. **Prompt Cards System**
- **Component**: `/packages/common/components/jetvision/PromptCards.tsx`
- **Categories**:
  - Apollo.io Intelligence (5 prompts)
  - Avinode Operations (4 prompts)
  - System Integration (3 prompts)
- **Features**:
  - Click to populate chat input
  - Editable before submission
  - Visual feedback on selection

### 5. **Sidebar Branding**
- JetVision logo and branding
- "Agent Portal" designation
- Consistent color scheme throughout

### 6. **Complete Color Theme**
- Navy: `rgb(6, 8, 28)`
- Gold: `rgb(219, 164, 1)`
- Platinum: `#e8eaf6`
- Applied to both light and dark modes

## 🔧 Configuration

### Environment Variables
Add to your `.env.local` file:

```env
# n8n Webhook Configuration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/jetvision-agent
NEXT_PUBLIC_N8N_API_KEY=your-optional-api-key

# Apollo.io Configuration
APOLLO_API_KEY=your-apollo-key
APOLLO_WORKSPACE=jetvision

# Avinode Configuration
AVINODE_API_URL=https://api.avinode.com/v1
AVINODE_API_KEY=your-avinode-key
```

### n8n Webhook Setup

Your n8n webhook should expect:

```json
{
  "prompt": "User's question",
  "context": {
    "source": "apollo|avinode|integration",
    "mode": "generate|stream",
    "messages": [/* Previous conversation */]
  }
}
```

And respond with:

```json
{
  "message": "Response text",
  // OR
  "results": [
    {
      "title": "Result Title",
      "subtitle": "Description",
      "metadata": {},
      "score": 85
    }
  ]
}
```

## 📁 File Structure

### New Files Created
```
/packages/ai/providers/
├── n8n-provider.ts              # n8n Agent Provider

/packages/common/components/jetvision/
├── PromptCards.tsx              # Prompt cards grid
├── SearchResultsPanel.tsx       # Results display panel
├── ExecutiveProfileCard.tsx     # Apollo contact cards
├── FlightQuoteCard.tsx          # Avinode flight cards
├── CampaignMetricsPanel.tsx     # Campaign analytics
├── JetVisionChat.tsx            # Complete chat interface
└── index.ts                     # Component exports

/packages/common/services/
└── n8n-webhook.service.ts       # Webhook integration service
```

### Modified Files
```
/packages/ai/
├── providers.ts                 # Added n8n-agent provider
├── models.ts                    # Added JETVISION_AGENT model

/packages/common/store/
└── chat.store.ts                # Default to JetVision model

/apps/web/app/
├── page.tsx                     # Redirect to chat
├── chat/page.tsx                # JetVision branded chat
├── globals.css                  # JetVision color scheme
└── layout.tsx                   # JetVision metadata

/packages/common/components/
├── layout/side-bar.tsx          # JetVision branding
├── footer.tsx                   # Aviation-themed footer
├── logo.tsx                     # JetVision jet logo
└── exmaple-prompts.tsx          # Aviation prompts
```

## 🎯 How It Works

### Chat Flow

1. **User Access**: Navigate to `/chat` (default route)
2. **Prompt Selection**: 
   - View categorized prompt cards
   - Click to populate input field
   - Or type custom query
3. **n8n Processing**:
   - Chat submission routes through n8n provider
   - Webhook processes with Apollo.io/Avinode
   - Response formatted for chat display
4. **Results Display**:
   - Formatted messages in chat thread
   - Structured data for contacts/aircraft
   - Real-time streaming support

### Provider Chain

```
User Input → Chat Store → n8n Provider → Webhook → Apollo/Avinode → Response → Chat UI
```

## 🚦 Usage Examples

### Apollo.io Queries
- "Find executive assistants at Fortune 500 companies"
- "Show conversion rates for jet charter campaigns"
- "Launch campaign for Series B companies"

### Avinode Queries
- "Check Gulfstream G650 availability NYC to London"
- "Find empty leg flights Miami to New York"
- "Show fleet status and locations"

### Integration Queries
- "Sync Apollo leads with Avinode bookings"
- "Check system health and API status"
- "Show active n8n workflows"

## 🔍 Testing

### Local Development
1. Start your n8n instance with webhook configured
2. Set environment variables
3. Run the application:
   ```bash
   npm run dev
   # or
   bun dev
   ```
4. Navigate to `http://localhost:3000`

### Verify Integration
1. Check JetVision branding appears
2. Test prompt card selection
3. Submit a query
4. Verify n8n webhook receives request
5. Confirm response displays in chat

## 🎨 Customization

### Modify Prompts
Edit `/packages/common/components/jetvision/PromptCards.tsx`

### Update Branding
- Colors: `/apps/web/app/globals.css`
- Logo: `/packages/common/components/logo.tsx`
- Metadata: `/apps/web/app/layout.tsx`

### Add New Categories
Extend the `promptCards` array in `PromptCards.tsx`

## 📊 Features Comparison

| Feature | Traditional LLMChat | JetVision Agent |
|---------|-------------------|-----------------|
| Primary Model | GPT/Claude/etc | n8n Agent Workflow |
| Data Source | LLM Knowledge | Apollo.io + Avinode |
| Prompts | Generic | Aviation-specific |
| Branding | LLMChat | JetVision |
| Integration | Multiple LLMs | n8n Workflows |
| Use Case | General Chat | Jet Charter Operations |

## 🛠️ Troubleshooting

### Common Issues

1. **No Response from Chat**
   - Verify n8n webhook URL is correct
   - Check webhook is active in n8n
   - Confirm API keys are set

2. **Prompt Cards Not Showing**
   - Clear browser cache
   - Check component imports
   - Verify file paths

3. **Styling Issues**
   - Ensure Tailwind classes compile
   - Check color variable definitions
   - Verify dark mode settings

## 🚀 Next Steps

1. **Configure n8n Workflows**
   - Set up Apollo.io integration nodes
   - Configure Avinode API connections
   - Create response formatting nodes

2. **Enhance Prompts**
   - Add more specific use cases
   - Create seasonal campaigns
   - Add industry-specific queries

3. **Extend Functionality**
   - Add voice input support
   - Implement result caching
   - Create custom visualizations

## 📝 Summary

JetVision Agent is now fully integrated as the primary chat interface, replacing traditional LLM providers with n8n workflow automation. The system routes all chat interactions through your n8n webhooks, enabling sophisticated Apollo.io and Avinode operations while maintaining the familiar LLMChat user experience.

The implementation preserves all existing LLMChat functionality while adding:
- Aviation-specific branding and terminology
- Predefined prompt cards for common operations
- n8n workflow integration for dynamic responses
- Apollo.io and Avinode data access
- Professional jet charter interface

---

*Implementation Complete - JetVision Agent is ready for production use*
*Version: 2.0.0 | Date: January 2024*