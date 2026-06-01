export const mockAuthRequests = {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    getMe: jest.fn(),
    refreshToken: jest.fn(),
    resetPassword: jest.fn(),
    forgotPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn()
}; 