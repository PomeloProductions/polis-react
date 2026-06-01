import User from '../../../models/user/user';

export const mockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    profile_image_url: undefined,
    full_name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    about_me: '',
    accepted_invites: 0,
    allow_users_to_find_me: true,
    allow_users_to_add_me: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
}); 