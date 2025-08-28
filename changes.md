Integrate the JetVision Agent chat interface with the main Thread system for unified message display. Based on our analysis of the current architecture where JetVisionChat uses SearchResultsPanel while the main chat uses Thread→ThreadItem→MarkdownContent, implement the following changes:

**1. UI Integration:**

- Ensure smooth scroll functionality works from PromptCards to the ChatInput component
- Maintain the existing Thread→ThreadItem→MarkdownContent message display architecture

**2. n8n Response Routing Fix:**

- Update the n8n provider (`packages/ai/providers/n8n-provider.ts`) to output responses in ThreadItem format instead of SearchResult format
- Ensure n8n responses populate `threadItem.answer.text` field for proper display in MarkdownContent component
- Remove dependency on SearchResultsPanel for n8n response display

**3. State Management Alignment:**

- Integrate JetVisionChat's prompt selection logic with the main chat store (`useChatStore`)
- Ensure n8n responses create proper ThreadItem objects in the chat store
- Update the agent stream handling to work with n8n provider responses
- Maintain compatibility with existing Apollo.io and Avinode integrations

**4. Response Transformation Logic:**

- Modify the n8n provider's `formatResponse` method to return plain text suitable for MarkdownContent rendering
- Remove SearchResult transformation logic since we're using the Thread system
- Ensure n8n responses include proper metadata for sources, steps, and follow-up suggestions if available
- Test that responses display correctly in the ThreadItem→MarkdownContent pipeline

**5. Preserve Existing Functionality:**

- Keep all current Thread system features (message actions, citations, animated text, etc.)
- Maintain the TableOfMessages navigation
- Ensure the ChatInput component's data-chat-input attribute remains for scroll targeting
- Preserve the enhanced prompt selection with parameters from the recent manual changes

The goal is to have a single, unified chat interface that combines JetVision's prompt cards with the robust Thread system for message display, while ensuring n8n agent responses appear correctly in the conversation thread.