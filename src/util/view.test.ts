/// <reference types="jest" />
import '@testing-library/jest-dom';
import { isElementInViewport } from './view';

describe('view utilities', () => {
  describe('isElementInViewport', () => {
    const VIEWPORT_HEIGHT = 800;
    const VIEWPORT_WIDTH = 1024;

    beforeEach(() => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: VIEWPORT_HEIGHT
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORT_WIDTH
      });

      // Mock document dimensions
      Object.defineProperty(document.documentElement, 'clientHeight', {
        writable: true,
        configurable: true,
        value: VIEWPORT_HEIGHT
      });

      Object.defineProperty(document.documentElement, 'clientWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORT_WIDTH
      });
    });

    it('should return true when element is fully in viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          bottom: VIEWPORT_HEIGHT / 2,
          right: VIEWPORT_WIDTH / 2
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(true);
    });

    it('should return false when element is partially in viewport from top', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: -100,
          left: 0,
          bottom: VIEWPORT_HEIGHT / 2,
          right: VIEWPORT_WIDTH / 2
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is completely outside viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: -200,
          left: -200,
          bottom: -100,
          right: -100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is to the left of viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 0,
          left: -200,
          bottom: 100,
          right: -100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is to the right of viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 0,
          left: VIEWPORT_WIDTH + 100,
          bottom: 100,
          right: VIEWPORT_WIDTH + 200
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is above viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: -200,
          left: 0,
          bottom: -100,
          right: 100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is below viewport', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          bottom: VIEWPORT_HEIGHT * 1.34, // This will make rect.bottom * 0.75 > VIEWPORT_HEIGHT
          right: 100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement)).toBe(false);
    });

    it('should consider 75% of bottom edge for viewport visibility', () => {
      // Test with bottom edge at 75% of viewport height - should be visible
      const mockElement1 = {
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          bottom: VIEWPORT_HEIGHT / 0.75, // This will make rect.bottom * 0.75 = VIEWPORT_HEIGHT
          right: 100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement1)).toBe(true);
      
      // Test with bottom edge at maximum allowed value - should be visible
      const mockElement2 = {
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          bottom: VIEWPORT_HEIGHT / 0.75, // This will make rect.bottom * 0.75 = VIEWPORT_HEIGHT
          right: 100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement2)).toBe(true);
      
      // Test with bottom edge too far beyond viewport height - should not be visible
      const mockElement3 = {
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          bottom: (VIEWPORT_HEIGHT / 0.75) + 1, // This will make rect.bottom * 0.75 > VIEWPORT_HEIGHT
          right: 100
        })
      } as HTMLElement;
      
      expect(isElementInViewport(mockElement3)).toBe(false);
    });
  });
}); 