// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockLocation = {
    pathname: '/',
    search: '',
    hash: '',
    state: null
};

const mockUseParams = jest.fn().mockReturnValue({});

// Legacy alias for backwards compatibility in tests
const mockHistory = {
    push: mockNavigate,
    replace: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    listen: jest.fn(),
    location: mockLocation
};

export { mockHistory, mockNavigate, mockUseParams, mockLocation }; 