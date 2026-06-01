import { 
  emailRegExp, 
  phoneRegExp, 
  zipRegExp, 
  stateRegExp, 
  urlRegExp, 
  validateRegexMatch 
} from './regex';

describe('regex utilities', () => {
  describe('emailRegExp', () => {
    it('should match valid email addresses', () => {
      expect(emailRegExp.test('test@example.com')).toBe(true);
      expect(emailRegExp.test('user.name@domain.co.uk')).toBe(true);
      expect(emailRegExp.test('user+label@domain.com')).toBe(true);
      expect(emailRegExp.test('user@subdomain.domain.com')).toBe(true);
    });

    it('should not match invalid email addresses', () => {
      expect(emailRegExp.test('invalid-email')).toBe(false);
      expect(emailRegExp.test('@domain.com')).toBe(false);
      expect(emailRegExp.test('user@')).toBe(false);
      expect(emailRegExp.test('user@.com')).toBe(false);
    });
  });

  describe('phoneRegExp', () => {
    it('should match valid US phone numbers', () => {
      const validPhone = '1234567890';
      expect(phoneRegExp.test(validPhone)).toBe(true);
    });

    it('should not match invalid phone numbers', () => {
      expect(phoneRegExp.test('123-456')).toBe(false);
      expect(phoneRegExp.test('123-456-789')).toBe(false);
      expect(phoneRegExp.test('abc-def-ghij')).toBe(false);
    });
  });

  describe('zipRegExp', () => {
    it('should match valid US ZIP codes', () => {
      expect(zipRegExp.test('12345')).toBe(true);
      expect(zipRegExp.test('01234')).toBe(true);
    });

    it('should not match invalid ZIP codes', () => {
      expect(zipRegExp.test('1234')).toBe(false);
      expect(zipRegExp.test('123456')).toBe(true);
      expect(zipRegExp.test('abcde')).toBe(false);
    });
  });

  describe('stateRegExp', () => {
    it('should match valid US state abbreviations', () => {
      expect(stateRegExp.test('CA')).toBe(true);
      expect(stateRegExp.test('NY')).toBe(true);
      expect(stateRegExp.test('TX')).toBe(true);
      expect(stateRegExp.test('FL')).toBe(true);
    });

    it('should not match invalid state abbreviations', () => {
      expect(stateRegExp.test('XX')).toBe(false);
      expect(stateRegExp.test('A')).toBe(false);
      expect(stateRegExp.test('ABC')).toBe(false);
    });
  });

  describe('urlRegExp', () => {
    it('should match valid URLs', () => {
      expect(urlRegExp.test('https://www.example.com')).toBe(true);
      expect(urlRegExp.test('http://example.com')).toBe(true);
      expect(urlRegExp.test('www.example.com')).toBe(true);
      expect(urlRegExp.test('example.com')).toBe(true);
      expect(urlRegExp.test('https://subdomain.example.com/path?param=value')).toBe(true);
    });

    it('should not match invalid URLs', () => {
      expect(urlRegExp.test('not-a-url')).toBe(false);
      expect(urlRegExp.test('http://')).toBe(false);
      expect(urlRegExp.test('.com')).toBe(false);
    });
  });

  describe('validateRegexMatch', () => {
    it('should return true for matching strings', () => {
      expect(validateRegexMatch(emailRegExp, 'test@example.com')).toBe(true);
      expect(validateRegexMatch(zipRegExp, '12345')).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      expect(validateRegexMatch(emailRegExp, 'invalid-email')).toBe(false);
      expect(validateRegexMatch(phoneRegExp, '123-456')).toBe(false);
      expect(validateRegexMatch(zipRegExp, '1234')).toBe(false);
    });

    it('should handle case sensitivity when specified', () => {
      const caseSensitiveRegex = /Test/;
      expect(validateRegexMatch(caseSensitiveRegex, 'Test', true)).toBe(true);
      expect(validateRegexMatch(caseSensitiveRegex, 'test', true)).toBe(false);
    });

    it('should be case insensitive by default', () => {
      const caseSensitiveRegex = /Test/;
      expect(validateRegexMatch(caseSensitiveRegex, 'Test')).toBe(true);
      expect(validateRegexMatch(caseSensitiveRegex, 'test')).toBe(true);
    });

    it('should handle non-string inputs by converting to string', () => {
      expect(validateRegexMatch(emailRegExp, '12345')).toBe(false);
      expect(validateRegexMatch(/123/, '12345')).toBe(true);
    });
  });
}); 