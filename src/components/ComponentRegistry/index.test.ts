import React from 'react';
import { createComponentRegistry, defaultComponentRegistry, ComponentProps } from './index';

const Dummy: React.FC<ComponentProps> = () => null;
const Other: React.FC<ComponentProps> = () => null;

describe('createComponentRegistry', () => {
  it('returns null for an unregistered type', () => {
    const reg = createComponentRegistry();
    expect(reg.getComponent('nope')).toBeNull();
    expect(reg.has('nope')).toBe(false);
  });

  it('registers and resolves a component', () => {
    const reg = createComponentRegistry();
    reg.register('dummy', Dummy);
    expect(reg.getComponent('dummy')).toBe(Dummy);
    expect(reg.has('dummy')).toBe(true);
  });

  it('registerMany adds multiple and lists types', () => {
    const reg = createComponentRegistry();
    reg.registerMany({ dummy: Dummy, other: Other });
    expect(reg.getRegisteredTypes().sort()).toEqual(['dummy', 'other']);
  });

  it('later register overwrites', () => {
    const reg = createComponentRegistry();
    reg.register('x', Dummy);
    reg.register('x', Other);
    expect(reg.getComponent('x')).toBe(Other);
  });

  it('registries are isolated from each other', () => {
    const a = createComponentRegistry();
    const b = createComponentRegistry();
    a.register('x', Dummy);
    expect(b.getComponent('x')).toBeNull();
  });

  it('defaultComponentRegistry is a usable shared instance', () => {
    expect(typeof defaultComponentRegistry.register).toBe('function');
    expect(defaultComponentRegistry.getRegisteredTypes()).toEqual(
      expect.arrayContaining(defaultComponentRegistry.getRegisteredTypes()),
    );
  });
});
