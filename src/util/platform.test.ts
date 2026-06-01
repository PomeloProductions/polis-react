// Mock window and navigator before importing the module

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    userAgent: '',
    maxTouchPoints: 0,
    msMaxTouchPoints: 0
  }
});

describe('platform-utils', () => {
  beforeEach(() => {
    jest.resetModules();
    
    // Mock matchMedia before requiring the module
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    // Reset navigator properties
    Object.defineProperty(navigator, 'platform', {
      value: '',
      configurable: true
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: '',
      configurable: true
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true
    });
    Object.defineProperty(navigator, 'msMaxTouchPoints', {
      value: 0,
      configurable: true
    });
  });

  describe('isIOS', () => {
    it('should return true for iPad', () => {
      Object.defineProperty(global.navigator, 'platform', {
        value: 'iPad',
        configurable: true,
      });
      const { isIOS } = require('./platform');
      expect(isIOS).toBe(true);
    });

    it('should return true for iPhone', () => {
      Object.defineProperty(global.navigator, 'platform', {
        value: 'iPhone',
        configurable: true,
      });
      const { isIOS } = require('./platform');
      expect(isIOS).toBe(true);
    });

    it('should return true for iPod', () => {
      Object.defineProperty(global.navigator, 'platform', {
        value: 'iPod',
        configurable: true,
      });
      const { isIOS } = require('./platform');
      expect(isIOS).toBe(true);
    });

    it('should return false for non-iOS devices', () => {
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
      const { isIOS } = require('./platform');
      expect(isIOS).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('should return true for Android devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G960U)',
        configurable: true,
      });
      const { isAndroid } = require('./platform');
      expect(isAndroid).toBe(true);
    });

    it('should return false for non-Android devices', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      const { isAndroid } = require('./platform');
      expect(isAndroid).toBe(false);
    });
  });

  describe('isChrome', () => {
    it('should return true for Chrome browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      const { isChrome } = require('./platform');
      expect(isChrome).toBe(true);
    });

    it('should return false for non-Chrome browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      const { isChrome } = require('./platform');
      expect(isChrome).toBe(false);
    });
  });

  describe('isSafari', () => {
    it('should return true for Safari browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true,
      });
      const { isSafari } = require('./platform');
      expect(isSafari).toBe(true);
    });

    it('should return false for Chrome browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      const { isSafari } = require('./platform');
      expect(isSafari).toBe(false);
    });
  });

  describe('isFirefox', () => {
    it('should return true for Firefox browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true,
      });
      const { isFirefox } = require('./platform');
      expect(isFirefox).toBe(true);
    });

    it('should return false for non-Firefox browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      const { isFirefox } = require('./platform');
      expect(isFirefox).toBe(false);
    });
  });

  describe('isEdge', () => {
    it('should return true for Edge browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        configurable: true,
      });
      const { isEdge } = require('./platform');
      expect(isEdge).toBe(true);
    });

    it('should return false for non-Edge browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      const { isEdge } = require('./platform');
      expect(isEdge).toBe(false);
    });
  });

  describe('isTouchDevice', () => {
    it('should return false when no touch capabilities are detected', () => {
      // Ensure all touch-related properties are falsy/0
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 });
      Object.defineProperty(navigator, 'msMaxTouchPoints', { value: 0 });
      
      const platform = require('./platform');
      expect(platform.isTouchDevice).toBe(false);
    });

    it('should return true when ontouchstart is present', () => {
      (window as any).ontouchstart = jest.fn();
      const platform = require('./platform');
      expect(platform.isTouchDevice).toBe(true);
    });

    it('should return true when maxTouchPoints is greater than 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 1 });
      const platform = require('./platform');
      expect(platform.isTouchDevice).toBe(true);
    });
  });

  describe('hasMouse', () => {
    it('should return true when matchMedia returns matches: true', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      const platform = require('./platform');
      expect(platform.hasMouse).toBe(true);
    });

    it('should return false when matchMedia returns matches: false', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      const platform = require('./platform');
      expect(platform.hasMouse).toBe(false);
    });
  });

  describe('isBot', () => {
    it('should return true for Google bot', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        configurable: true,
      });
      const { isBot } = require('./platform');
      expect(isBot).toBe(true);
    });

    it('should return true for other bots', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        configurable: true,
      });
      const { isBot } = require('./platform');
      expect(isBot).toBe(true);
    });

    it('should return false for regular browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });
      const { isBot } = require('./platform');
      expect(isBot).toBe(false);
    });
  });
}); 