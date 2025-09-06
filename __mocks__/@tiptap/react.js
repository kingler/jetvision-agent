module.exports = {
    Extension: {
        create: jest.fn(() => ({
            name: 'test-extension',
            addKeyboardShortcuts: jest.fn(),
        })),
    },
    useEditor: jest.fn(() => null),
    EditorContent: ({ children }) =>
        React.createElement('div', { 'data-testid': 'editor-content' }, children),
};
