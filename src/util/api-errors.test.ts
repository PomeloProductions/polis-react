import { parseApiError, firstFieldErrors } from './api-errors';

describe('parseApiError', () => {
  test('maps Athenia 400 { errors } to fieldErrors', () => {
    const err = { response: { status: 400, data: { errors: { name: ['Required'] } } } };
    const parsed = parseApiError(err, 'fallback');
    expect(parsed.fieldErrors).toEqual({ name: ['Required'] });
    expect(parsed.message).toBeNull();
  });

  test('also handles 422 { errors }', () => {
    const err = { response: { status: 422, data: { errors: { password: ['Too short'] } } } };
    expect(parseApiError(err, 'fallback').fieldErrors).toEqual({ password: ['Too short'] });
  });

  test('handles the flattened { status, data } shape api.ts may throw', () => {
    const err = { status: 400, data: { errors: { name: ['Required'] } } };
    expect(parseApiError(err, 'fallback').fieldErrors).toEqual({ name: ['Required'] });
  });

  test('uses a top-level message for non-field failures', () => {
    const err = { response: { status: 403, data: { message: 'Forbidden' } } };
    const parsed = parseApiError(err, 'fallback');
    expect(parsed.fieldErrors).toEqual({});
    expect(parsed.message).toBe('Forbidden');
  });

  test('falls back for opaque errors', () => {
    expect(parseApiError(new Error('boom'), 'fallback').message).toBe('fallback');
  });
});

describe('firstFieldErrors', () => {
  test('collapses each field to its first message', () => {
    expect(firstFieldErrors({ name: ['a', 'b'], email: ['c'] })).toEqual({
      name: 'a',
      email: 'c',
    });
  });
});
