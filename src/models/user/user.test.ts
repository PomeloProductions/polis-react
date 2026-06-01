import User, {
    userName
} from "./user";

test('Make sure that the user model can send the name properly with a registered user', () => {
    let model = {
        id: 4,
        first_name: 'Sven',
        last_name: 'Nevs',
        full_name: 'Sven Nevs',
        email: 'test@test.com',
        website_registered_at: '2019-10-10 02:12:12',
    } as User;

    expect(userName(model)).toBe('Sven Nevs');
});

