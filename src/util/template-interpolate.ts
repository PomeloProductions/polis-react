/**
 * Mirror of polis-laravel's EmailTemplateRenderingService / PushTemplate
 * RenderingService interpolator, in TypeScript, used for the live preview
 * in TemplateEditor. Resolves Blade-style `{{ var.path }}` placeholders
 * against a `previewVariables` object so admins can see roughly what the
 * outgoing email/push will look like.
 *
 * Differences vs. the PHP service:
 *  - No HTML sanitization here — preview is rendered into a sandboxed
 *    iframe-equivalent (dangerouslySetInnerHTML inside an isolated div),
 *    and the server-side sanitizer remains the source of truth.
 *  - Missing variables resolve to an empty string, matching the PHP side.
 *  - Variable values are NOT HTML-escaped in the preview interpolator —
 *    we trust the admin's own preview-variable inputs.
 */

type Primitive = string | number | boolean | null | undefined;
type Container = Record<string, unknown> | unknown[];
export type TemplateVariables = Record<string, unknown>;

/**
 * Resolve `path.to.value` against a nested object, mirroring Laravel's
 * data_get() semantics for dotted-path access into arrays + objects.
 */
function resolvePath(variables: TemplateVariables, path: string): unknown {
    const segments = path.split('.');
    let current: unknown = variables;
    for (const segment of segments) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current === 'object') {
            const container = current as Container;
            if (Array.isArray(container)) {
                const idx = Number(segment);
                if (Number.isInteger(idx) && idx >= 0 && idx < container.length) {
                    current = container[idx];
                    continue;
                }
                return undefined;
            }
            current = (container as Record<string, unknown>)[segment];
        } else {
            return undefined;
        }
    }
    return current;
}

function coerce(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? '1' : '';
    if (typeof value === 'number' || typeof value === 'string') return String(value);
    return '';
}

/**
 * Substitute every `{{ var.path }}` (with optional surrounding whitespace)
 * in the input template with the matching value from `variables`. Missing
 * paths resolve to an empty string.
 */
export function interpolateTemplate(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
        const value: Primitive | Container = resolvePath(variables, path) as Primitive | Container;
        return coerce(value);
    });
}
