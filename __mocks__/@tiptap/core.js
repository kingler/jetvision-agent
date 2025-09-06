module.exports = {
    Extension: {
        create: jest.fn(() => ({
            name: 'test-extension',
            addKeyboardShortcuts: jest.fn(),
        })),
    },
};
