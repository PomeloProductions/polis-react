import { 
  ellipsisText, 
  grammaticalList, 
  addHttpPrefix, 
  convertHexColorToBrightness, 
  initialize 
} from './strings';

describe('strings utilities', () => {
  describe('ellipsisText', () => {
    it('should truncate text with ellipsis', () => {
      expect(ellipsisText('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate text shorter than maxLength', () => {
      expect(ellipsisText('Hello', 10)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(ellipsisText('', 5)).toBe('');
    });
  });

  describe('grammaticalList', () => {
    it('should return empty string for empty array', () => {
      expect(grammaticalList([])).toBe('');
    });

    it('should return single item without conjunction', () => {
      expect(grammaticalList(['Apple'])).toBe('Apple');
    });

    it('should join two items with "and"', () => {
      expect(grammaticalList(['Apple', 'Banana'])).toBe('Apple and Banana');
    });

    it('should join three or more items with commas and "and"', () => {
      expect(grammaticalList(['Apple', 'Banana', 'Orange'])).toBe('Apple, Banana and Orange');
    });
  });

  describe('addHttpPrefix', () => {
    it('should add http prefix if missing', () => {
      expect(addHttpPrefix('example.com')).toBe('http://example.com');
    });

    it('should not add prefix if already present', () => {
      expect(addHttpPrefix('http://example.com')).toBe('http://example.com');
      expect(addHttpPrefix('https://example.com')).toBe('https://example.com');
    });

    it('should handle empty string', () => {
      expect(addHttpPrefix('')).toBe('');
    });

    it('should handle null input', () => {
      expect(addHttpPrefix(null as unknown as string)).toBe('');
    });
  });

  describe('convertHexColorToBrightness', () => {
    it('should calculate brightness correctly', () => {
      expect(convertHexColorToBrightness('#FFFFFF')).toBe(255);
      expect(convertHexColorToBrightness('#000000')).toBe(0);
    });

    it('should handle hex colors without # prefix', () => {
      expect(convertHexColorToBrightness('FFFFFF')).toBe(255);
      expect(convertHexColorToBrightness('000000')).toBe(0);
    });

    it('should handle invalid hex colors', () => {
      expect(convertHexColorToBrightness('invalid')).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should return first letter of first and last name', () => {
      expect(initialize('John Doe')).toBe('JD');
      expect(initialize('Mary Jane Smith')).toBe('MS');
    });

    it('should handle single name', () => {
      expect(initialize('John')).toBe('J');
    });

    it('should handle empty string', () => {
      expect(initialize('')).toBe('');
    });

    it('should handle null input', () => {
      expect(initialize(null as unknown as string)).toBe('');
    });

    it('should handle extra spaces', () => {
      expect(initialize('John  Doe')).toBe('JD');
      expect(initialize('  John  Doe  ')).toBe('JD');
    });
  });
}); 