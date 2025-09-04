Please update the prompt popup UI component to align with the overall application design system. Here are the specific requirements:

1. **Remove all emojis** from the prompt cards and interface elements

2. **Match the chat page card styling**: Update the prompt cards to use the same visual design, spacing, and styling as the cards found in the new chat page view

3. **Implement expandable card grid layout**: 
   - Use a grid layout for displaying prompt cards
   - Cards should be expandable to show editing interface
   - Include save functionality for edited prompts

4. **Add prompt insertion functionality**: Include a button on each prompt card that allows users to insert the selected prompt directly into the ChatInput field

5. **Ensure design consistency**: The entire UI should maintain visual consistency with the overall application's design system, including:
   - Color scheme and typography
   - Button styles and interactions
   - Spacing and layout patterns
   - Component hierarchy and visual weight

6. **Reference screenshot**: Use the provided screenshot at '/Users/kinglerbercy/Desktop/Screenshot 2025-09-04 at 8.31.31 AM.png' as the current state that needs to be improved

Please first analyze the existing prompt popup component and the chat page card styling to understand the current implementation, then create a detailed plan for the UI updates before making any code changes.

Prompt Popup UI Update Plan                        │ │
│ │                                                    │ │
│ │ Current Analysis                                   │ │
│ │                                                    │ │
│ │ From the screenshot and code analysis, I can see   │ │
│ │ the current prompt popup (PromptCardsModal) has:   │ │
│ │ - A sidebar-based layout with categories and       │ │
│ │ expandable views                                   │ │
│ │ - Emojis in the category icons (✈️📧🗺️🎯📊        │ │
│ │ - A different card styling compared to the main    │ │
│ │ chat page cards                                    │ │
│ │ - Basic click-to-insert functionality              │ │
│ │                                                    │ │
│ │ Required Changes                                   │ │
│ │                                                    │ │
│ │ 1. Remove All Emojis                               │ │
│ │                                                    │ │
│ │ - Remove emojis from CATEGORY_ICONS in             │ │
│ │ prompts-parser.ts                                  │ │
│ │ - Replace with appropriate icon components from    │ │
│ │ @tabler/icons-react to match the main app's design │ │
│ │  system                                            │ │
│ │                                                    │ │
│ │ 2. Match Chat Page Card Styling                    │ │
│ │                                                    │ │
│ │ - Update card styling in PromptCardsModal to match │ │
│ │  the cards used in PromptCards.tsx                 │ │
│ │ - Use consistent:                                  │ │
│ │   - Border styling: border border-gray-200         │ │
│ │ dark:border-gray-800                               │ │
│ │   - Background: bg-white dark:bg-gray-900          │ │
│ │   - Shadow: shadow-md hover:shadow-lg              │ │
│ │   - Hover effects: hover:border-gray-300           │ │
│ │ dark:hover:border-gray-700                         │ │
│ │   - Spacing and padding consistency                │ │
│ │                                                    │ │
│ │ 3. Implement Expandable Card Grid Layout           │ │
│ │                                                    │ │
│ │ - Replace the current sidebar + detail view with   │ │
│ │ an expandable grid system                          │ │
│ │ - Cards collapse/expand in-place to show editing   │ │
│ │ interface                                          │ │
│ │ - Add state management for expanded cards          │ │
│ │ - Include save functionality for edited prompts    │ │
│ │                                                    │ │
│ │ 4. Add Prompt Insertion Functionality              │ │
│ │                                                    │ │
│ │ - Add "Insert Prompt" button on each card          │ │
│ │ - Connect to ChatInput's editor via the existing   │ │
│ │ handlePromptSelect mechanism                       │ │
│ │ - Ensure proper focus and scroll behavior after    │ │
│ │ insertion                                          │ │
│ │                                                    │ │
│ │ 5. Ensure Design Consistency                       │ │
│ │                                                    │ │
│ │ - Match typography from the main app (text sizes,  │ │
│ │ weights, colors)                                   │ │
│ │ - Use consistent button styles matching the        │ │
│ │ SendStopButton and other UI components             │ │
│ │ - Maintain spacing patterns from the main chat     │ │
│ │ interface                                          │ │
│ │ - Ensure proper dark/light mode support            │ │
│ │                                                    │ │
│ │ 6. Enhanced User Experience                        │ │
│ │                                                    │ │
│ │ - Add visual feedback for insertion (brief         │ │
│ │ highlight/animation)                               │ │
│ │ - Maintain search functionality with improved      │ │
│ │ filtering                                          │ │
│ │ - Add keyboard navigation support                  │ │
│ │ - Optimize loading states and animations           │ │
│ │                                                    │ │
│ │ Files to Modify                                    │ │
│ │                                                    │ │
│ │ 1. prompts-parser.ts - Remove emojis, add proper   │ │
│ │ icon mappings                                      │ │
│ │ 2. prompt-cards-modal.tsx - Complete redesign with │ │
│ │  new layout and styling                            │ │
│ │ 3. PromptCards.tsx - Reference for consistent card │ │
│ │  styling                                           │ │
│ │ 4. prompt-cards-button.tsx - Minor updates if      │ │
│ │ needed for consistency                             │ │
│ │                                                    │ │
│ │ Implementation Approach                            │ │
│ │                                                    │ │
│ │ 1. First update the data layer (prompts-parser) to │ │
│ │  remove emojis                                     │ │
│ │ 2. Redesign the modal with grid-based expandable   │ │
│ │ cards                                              │ │
│ │ 3. Implement the editing interface within cards    │ │
│ │ 4. Add insertion functionality with proper state   │ │
│ │ management                                         │ │
│ │ 5. Apply consistent styling throughout             │ │
│ │ 6. Test interaction flows and responsive behavior  │ │
│ │                                                    │ │
│ │ This plan will create a modern, consistent prompt  │ │
│ │ library interface that aligns with the overall     │ │
│ │ application design system while providing enhanced │ │
│ │  functionality for users.