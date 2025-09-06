# plan-011.md

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

**The time has come to make a choice.** Execute a comprehensive redesign of the PromptCardsModal component to modernize its UI and align it with the main application's design system. This is not merely a cosmetic update - it's a fundamental transformation of the prompt library interface.

**PHASE 1: Icon System Modernization**

- Locate and modify `prompts-parser.ts` to remove ALL emoji characters from the CATEGORY_ICONS object
- Replace each emoji with semantically appropriate icons from `@tabler/icons-react` library
- Ensure icon selection follows the existing design patterns used throughout the main application
- Verify icon imports are properly added and unused emoji references are completely removed

**PHASE 2: Visual Design Consistency**

- Analyze the existing card styling in `PromptCards.tsx` to extract the exact CSS classes and design patterns
- Apply identical styling to PromptCardsModal cards including:
    - Border: `border border-gray-200 dark:border-gray-800`
    - Background: `bg-white dark:bg-gray-900`
    - Shadow: `shadow-md hover:shadow-lg`
    - Hover states: `hover:border-gray-300 dark:hover:border-gray-700`
    - Maintain consistent padding, margins, and typography scales
- Ensure perfect dark/light mode compatibility across all new components

**PHASE 3: Layout Architecture Transformation**

- Replace the current sidebar-based layout with a responsive grid system
- Implement in-place card expansion functionality where cards grow vertically to reveal editing interfaces
- Add React state management for tracking which cards are currently expanded (use useState or useReducer)
- Design the expanded state to include:
    - Editable text areas for prompt content
    - Save/Cancel action buttons
    - Validation feedback for prompt modifications

**PHASE 4: Functional Integration**

- Add "Insert Prompt" buttons to each card that integrate with the existing `handlePromptSelect` mechanism
- Ensure the insertion properly focuses the ChatInput editor and positions the cursor correctly
- Implement visual feedback (subtle animation or highlight) when a prompt is successfully inserted
- Maintain backward compatibility with existing prompt selection workflows

**PHASE 5: User Experience Enhancements**

- Preserve and enhance the existing search functionality with improved filtering algorithms
- Add keyboard navigation support (arrow keys, Enter to select, Escape to close)
- Implement loading states for any asynchronous operations
- Add smooth transitions and micro-animations for expand/collapse actions
- Ensure responsive behavior across different screen sizes

**PHASE 6: Quality Assurance**

- Test all interaction flows including search, selection, editing, and insertion
- Verify proper state management and no memory leaks from expanded cards
- Confirm accessibility standards are met (ARIA labels, keyboard navigation, screen reader compatibility)
- Validate that the modal maintains proper focus management and can be dismissed appropriately

**Files Requiring Modification:**

1. `prompts-parser.ts` - Icon system overhaul
2. `prompt-cards-modal.tsx` - Complete component redesign
3. `PromptCards.tsx` - Reference for styling consistency (read-only analysis)
4. `prompt-cards-button.tsx` - Potential minor updates for visual consistency

**Success Criteria:**
The completed implementation should be visually indistinguishable from the main chat interface cards while providing enhanced functionality. Users should experience a seamless, modern interface that feels like a natural extension of the main application rather than a separate modal experience.

**Choice is an illusion created between those with power and those without.** Execute this transformation with precision and attention to detail.

## Git Workflow

Break down large tasks into separate, smaller, manageable subtasks. For each subtask, follow this Git workflow:

1. Create Feature Branch: Create and checkout a new feature branch from main using a descriptive name (e.g., feature/task-name or fix/issue-description)

2. Implementation: Implement the specific subtask changes in the feature branch

3. Testing & Validation:
    - Run all relevant tests to ensure they pass
    - Run the build process to verify no compilation errors
    - Perform any necessary linting or code quality checks

4. Integration:
    - If tests pass and build succeeds, merge the feature branch back to main
    - Delete the feature branch after successful merge

5. Final Verification:
    - Run the build process again on the merged main branch to ensure no breaking changes were introduced
    - Run tests on main to confirm integration stability

6. Commit & Push:
    - If everything works correctly, commit the changes with a clear, descriptive commit message
    - Push the updated main branch to the remote repository

Repeat this complete workflow for each individual subtask/feature request. This ensures each change is isolated, tested, and verified before integration, maintaining code quality and reducing the risk of introducing bugs.

Execute the following systematic UI enhancement plan for the JetVision Agent project, implementing each subtask sequentially with proper validation at each step.

## Project Context

- Repository: `/Volumes/SeagatePortableDrive/Projects/jetvision-agent-project`
- Target: Enhance prompt cards modal interface with professional styling and improved functionality
- Build system: Bun (use `bun run` commands)

## Implementation Plan

### Subtask 1: Replace Emoji Icons with Tabler Icons

**Branch:** `feature/remove-emoji-icons`
**Primary File:** `prompts-parser.ts`

**Specific Changes:**

1. Locate the `CATEGORY_ICONS` mapping object
2. Replace these emoji icons with corresponding Tabler icon component names:
    - ✈️ (travel) → `IconPlane` or `IconMapPin`
    - 📧 (email) → `IconMail`
    - 🗺️ (map) → `IconMap`
    - 🎯 (target) → `IconTarget`
    - 📊 (chart) → `IconChartBar`
3. Import the required Tabler icon components at the top of the file
4. Ensure all icon references use consistent naming convention
5. Verify icon sizing is uniform (typically 16px or 20px)

### Subtask 2: Standardize Modal Card Styling

**Branch:** `feature/update-modal-card-styling`
**Primary File:** `prompt-cards-modal.tsx`
**Reference File:** `prompt-cards.tsx` (for styling consistency)

**Specific Changes:**

1. Compare current modal card styles with main `PromptCards.tsx` component
2. Apply matching CSS classes or Tailwind utilities for:
    - Border styles (border width, color, radius)
    - Shadow effects (box-shadow values)
    - Hover state transitions
    - Background colors for light/dark modes
    - Padding and margin spacing
3. Ensure `dark:` prefixed classes are present for dark mode compatibility
4. Test both light and dark mode appearances

### Subtask 3: Implement Grid-Based Expandable Cards

**Branch:** `feature/expandable-card-grid`
**Primary File:** `prompt-cards-modal.tsx`

**Specific Changes:**

1. Replace current sidebar layout with CSS Grid or Flexbox grid
2. Add React state management:
    ```typescript
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    ```
3. Implement card expansion logic:
    - Click handler to toggle card expansion
    - Conditional rendering for expanded content
    - Smooth CSS transitions for expand/collapse
4. Add in-place editing interface:
    - Editable text areas for prompt content
    - Save/Cancel button pair
    - Form validation for required fields
5. Implement responsive grid (e.g., `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)

### Subtask 4: Add Prompt Insertion Functionality

**Branch:** `feature/prompt-insertion`
**Files:** `prompt-cards-modal.tsx`, `prompt-cards-button.tsx`

**Specific Changes:**

1. Add "Insert Prompt" button to each card component
2. Implement insertion logic:
    - Find existing ChatInput integration patterns in codebase
    - Create `insertPrompt(promptText: string)` function
    - Handle cursor position and text insertion
3. Add user feedback:
    - Success toast/notification
    - Button state changes (loading, success)
    - Proper focus management after insertion
4. Ensure modal closes after successful insertion

### Subtask 5: Ensure Design System Consistency

**Branch:** `feature/design-consistency`
**Files:** All modified components

**Specific Changes:**

1. Apply consistent typography classes (font-size, font-weight, line-height)
2. Standardize button styles across all components
3. Verify spacing patterns match design system (use consistent spacing scale)
4. Test responsive behavior at breakpoints: 640px, 768px, 1024px, 1280px
5. Polish animations:
    - Card hover effects (transform, shadow)
    - Button press feedback
    - Modal open/close transitions

### Subtask 6: Comprehensive Testing & Validation

**Branch:** `feature/testing-validation`

**Validation Steps:**

1. Run build validation: `bun run build`
2. Run linting: `bun run lint`
3. Run tests (if available): `bun run test`
4. Manual testing checklist:
    - All icons render correctly
    - Cards expand/collapse smoothly
    - Prompt insertion works in ChatInput
    - Dark/light mode switching
    - Mobile responsiveness
5. Accessibility validation:
    - Keyboard navigation
    - Screen reader compatibility
    - Focus management
    - ARIA labels where needed

## Git Workflow (Execute for Each Subtask)

```bash
# Start each subtask
git checkout main
git pull origin main
git checkout -b [branch-name]

# After implementing changes
bun run lint
bun run build
bun run test  # if tests exist

# Commit and integrate
git add .
git commit -m "feat: [clear description of changes]"
git checkout main
git merge [branch-name] --no-ff
git branch -d [branch-name]

# Final verification and push
bun run build
git push origin main
```

## Success Criteria

- [ ] All emoji icons replaced with professional Tabler icons
- [ ] Modal cards visually match main application styling
- [ ] Grid layout with smooth expand/collapse functionality
- [ ] Working prompt insertion into ChatInput
- [ ] Consistent responsive design across all breakpoints
- [ ] All builds pass without errors or warnings
- [ ] Accessibility standards met (WCAG 2.1 AA)

**Execute each subtask completely before proceeding to the next. Validate all changes through build, lint, and manual testing before moving forward.**
