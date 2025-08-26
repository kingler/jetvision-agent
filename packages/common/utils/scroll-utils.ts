/**
 * Scroll utilities for smooth scrolling behavior
 */

/**
 * Scrolls to the chat input with smooth animation
 * Positions the element optimally in the viewport (not at the very top)
 */
export const scrollToChatInput = (delay: number = 300) => {
    setTimeout(() => {
        // Look for the chat input container by its ref or class
        const chatInputElement = document.querySelector('[data-chat-input="true"]') as HTMLElement;
        
        if (!chatInputElement) {
            // Fallback: look for the chat input by common selectors
            const fallbackElement = document.querySelector('.chat-input-container, [class*="chat-input"]') as HTMLElement;
            if (fallbackElement) {
                scrollToElement(fallbackElement);
            }
            return;
        }
        
        scrollToElement(chatInputElement);
    }, delay);
};

/**
 * Scrolls to a specific element with smooth animation
 * Positions the element at 1/3 from the top of the viewport for optimal viewing
 */
export const scrollToElement = (element: HTMLElement) => {
    if (!element) return;
    
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    
    // Position element at 1/3 from top of viewport for optimal viewing
    const viewportHeight = window.innerHeight;
    const targetPosition = absoluteElementTop - (viewportHeight / 3);
    
    window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
    });
};

/**
 * Scrolls to chat input with a focus effect
 * Adds visual feedback to indicate the target element
 */
export const scrollToChatInputWithFocus = (delay: number = 300) => {
    setTimeout(() => {
        const chatInputElement = document.querySelector('[data-chat-input="true"]') as HTMLElement;
        
        if (!chatInputElement) return;
        
        // Scroll to element
        scrollToElement(chatInputElement);
        
        // Add focus effect after scroll completes
        setTimeout(() => {
            // Find the editor element within the chat input
            const editorElement = chatInputElement.querySelector('.ProseMirror') as HTMLElement;
            if (editorElement) {
                // Add a subtle pulse effect
                editorElement.classList.add('animate-pulse');
                setTimeout(() => {
                    editorElement.classList.remove('animate-pulse');
                }, 1000);
                
                // Focus the editor
                editorElement.focus();
            }
        }, 500); // Wait for scroll animation to complete
    }, delay);
};
