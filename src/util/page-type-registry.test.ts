import { createPageTypeRegistry } from './page-type-registry';

describe('page-type-registry', () => {
  it('resolves redirect from a registered page type', () => {
    const reg = createPageTypeRegistry();
    reg.register('todo', {
      redirect: (page) =>
        page.config_json?.todo_level === 'root' ? '/todos/today' : `/todos/${page.slug}`,
      draggable: true,
    });

    expect(reg.resolveRedirect({ page_type: 'todo', config_json: { todo_level: 'root' } })).toBe(
      '/todos/today',
    );
    expect(
      reg.resolveRedirect({ page_type: 'todo', slug: 'work', config_json: { todo_level: 'day' } }),
    ).toBe('/todos/work');
  });

  it('returns null redirect for unregistered / no-redirect types', () => {
    const reg = createPageTypeRegistry();
    reg.register('dashboard', { containerSize: 'lg' });
    expect(reg.resolveRedirect({ page_type: 'dashboard' })).toBeNull();
    expect(reg.resolveRedirect({ page_type: 'mystery' })).toBeNull();
    expect(reg.resolveRedirect({})).toBeNull();
  });

  it('applies container-size default of xl', () => {
    const reg = createPageTypeRegistry();
    reg.register('dashboard', { containerSize: 'lg' });
    expect(reg.resolveContainerSize('dashboard')).toBe('lg');
    expect(reg.resolveContainerSize('todo')).toBe('xl');
    expect(reg.resolveContainerSize(undefined)).toBe('xl');
  });

  it('applies draggable default of false', () => {
    const reg = createPageTypeRegistry();
    reg.register('todo', { draggable: true });
    expect(reg.isDraggable('todo')).toBe(true);
    expect(reg.isDraggable('dashboard')).toBe(false);
    expect(reg.isDraggable(undefined)).toBe(false);
  });

  it('registerMany + getRegisteredTypes', () => {
    const reg = createPageTypeRegistry();
    reg.registerMany({ todo: { draggable: true }, dashboard: { containerSize: 'lg' } });
    expect(reg.getRegisteredTypes().sort()).toEqual(['dashboard', 'todo']);
  });
});
