# Testing Send Button and Prompt Selection

## Test Instructions

1. **Open the JetVision Agent app in your browser:**
   - Navigate to http://localhost:3002/chat

2. **Open the browser's Developer Console:**
   - Press F12 or right-click → Inspect → Console tab
   - You should see debug logs we've added

3. **Test typing and sending a message:**
   - Type any text in the chat input (e.g., "Test message")
   - Watch console for: `[ChatInput Debug] Editor text updated: Test message`
   - Click the send button (arrow icon)
   - Watch console for:
     - `[SendButton] Clicked - hasTextInput: true, isGenerating: false`
     - `[SendButton] Calling sendMessage()...`
     - `[SendMessage] Starting - isSignedIn:...`
     - `Sending message to n8n webhook:...`

4. **Test selecting and sending a prompt card:**
   - Refresh the page (F5)
   - Click on any prompt card (e.g., "Aircraft Availability")
   - Watch console for:
     - `[ExamplePrompts] Prompt selected:...`
     - `[ExamplePrompts] Full prompt:...`
     - `[ExamplePrompts] Editor content set to:...`
   - The text should appear in the editor
   - Click the send button
   - Watch console for the same send messages as above

## Expected Console Output

When successfully sending to n8n, you should see:
```
Sending message to n8n webhook: {
  "prompt": "...",
  "message": "...",
  "threadId": "...",
  "threadItemId": "...",
  "context": {...},
  "intent": "...",
  "expectedOutput": {...}
}
```

## Common Issues & Solutions

### Issue: Send button doesn't work
- **Symptom**: Clicking send button does nothing
- **Check Console**: Look for `[SendButton] No text input detected!`
- **Solution**: The editor text tracking is fixed now, should work

### Issue: Prompt doesn't populate editor
- **Symptom**: Clicking prompt card doesn't fill text
- **Check Console**: Look for `[ExamplePrompts] No editor available!`
- **Solution**: Editor initialization issue - refresh page

### Issue: n8n webhook timeout
- **Symptom**: Long wait after sending, eventual timeout
- **Check**: Verify n8n workflow is running at https://n8n.vividwalls.blog
- **Solution**: n8n server may be down or workflow not active

## Verification Checklist

- [ ] Editor tracks typed text (console shows updates)
- [ ] Send button enables when text is present
- [ ] Send button triggers sendMessage function
- [ ] Prompt cards populate editor with full text
- [ ] Parameters from prompts are stored in sessionStorage
- [ ] n8n webhook payload is properly formatted
- [ ] Message appears in chat after sending