import { normalizeManifest } from './manifest';

describe('normalizeManifest', () => {
  it('returns null for non-objects / missing slug', () => {
    expect(normalizeManifest(null)).toBeNull();
    expect(normalizeManifest('x')).toBeNull();
    expect(normalizeManifest({ name: 'No slug' })).toBeNull();
  });

  it('fills defaults and keeps a valid frontend deliverable', () => {
    const m = normalizeManifest({
      slug: 'feedback',
      frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'feedback-widget' }],
    });
    expect(m).toEqual({
      name: 'feedback',
      slug: 'feedback',
      version: '0.0.0',
      frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'feedback-widget' }],
    });
  });

  it('carries name/version/image/config_schema + deliverable title', () => {
    const m = normalizeManifest({
      name: 'Feedback',
      slug: 'feedback',
      version: '1.2.3',
      image: 'ghcr.io/x/feedback:1.2.3',
      config_schema: { type: 'object' },
      frontend: [{ bundle: 'b.js', space: 's', component: 'c', title: 'My Widget' }],
    });
    expect(m?.image).toBe('ghcr.io/x/feedback:1.2.3');
    expect(m?.config_schema).toEqual({ type: 'object' });
    expect(m?.frontend?.[0].title).toBe('My Widget');
  });

  it('drops malformed deliverables (missing required string fields)', () => {
    const m = normalizeManifest({
      slug: 'p',
      frontend: [
        { bundle: 'ok.js', space: 's', component: 'c' },
        { bundle: 'no-space.js', component: 'c' },
        { space: 's', component: 'c' },
        'garbage',
        null,
      ],
    });
    expect(m?.frontend).toHaveLength(1);
    expect(m?.frontend?.[0].bundle).toBe('ok.js');
  });

  it('treats a non-array frontend as empty', () => {
    expect(normalizeManifest({ slug: 'p', frontend: 'nope' })?.frontend).toEqual([]);
    expect(normalizeManifest({ slug: 'p' })?.frontend).toEqual([]);
  });
});
