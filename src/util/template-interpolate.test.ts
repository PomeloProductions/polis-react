import { interpolateTemplate } from './template-interpolate';

describe('interpolateTemplate', () => {
  test('substitutes a single placeholder', () => {
    const result = interpolateTemplate('Hello {{ name }}', { name: 'Ada' });
    expect(result).toBe('Hello Ada');
  });

  test('resolves a dotted path through nested objects', () => {
    const result = interpolateTemplate('Hi {{ user.first_name }}', {
      user: { first_name: 'Ada' },
    });
    expect(result).toBe('Hi Ada');
  });

  test('missing variables resolve to empty string', () => {
    // Matches PHP service behavior — no exception, just empty.
    const result = interpolateTemplate('Hello {{ missing.path }}!', {});
    expect(result).toBe('Hello !');
  });

  test('handles multiple placeholders in one string', () => {
    const result = interpolateTemplate('{{ greeting }}, {{ user.name }}! Visit {{ app.url }}.', {
      greeting: 'Hi',
      user: { name: 'Ada' },
      app: { url: 'polis.test' },
    });
    expect(result).toBe('Hi, Ada! Visit polis.test.');
  });

  test('coerces booleans to "1" or "" matching PHP', () => {
    expect(interpolateTemplate('Active: {{ flag }}', { flag: true })).toBe('Active: 1');
    expect(interpolateTemplate('Active: {{ flag }}', { flag: false })).toBe('Active: ');
  });

  test('coerces numbers to string', () => {
    expect(interpolateTemplate('Count: {{ n }}', { n: 42 })).toBe('Count: 42');
  });

  test('returns objects as empty string (not [object Object])', () => {
    // Non-scalar values resolve to empty — matches PHP service.
    expect(interpolateTemplate('{{ user }}', { user: { name: 'Ada' } })).toBe('');
  });

  test('preserves whitespace inside the curly-brace tag', () => {
    const result = interpolateTemplate('{{   user.name   }}', { user: { name: 'Ada' } });
    expect(result).toBe('Ada');
  });
});
