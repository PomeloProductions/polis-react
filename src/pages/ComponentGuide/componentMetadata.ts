export type ConfigOptionType = 'boolean' | 'string' | 'number' | 'select' | 'multiselect' | 'json';

export interface ConfigOption {
  key: string;
  label: string;
  description: string;
  type: ConfigOptionType;
  options?: { value: string; label: string }[];
  default?: unknown;
}

export interface ExampleConfig {
  label: string;
  description: string;
  config: Record<string, unknown>;
}

export type ComponentCategory = 'dashboard' | 'content' | 'settings';

export interface ComponentGuideEntry {
  type: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: ComponentCategory;
  configOptions: ConfigOption[];
  exampleConfigs: ExampleConfig[];
  requiresAuth: boolean;
  pageParamsSupported?: string[];
  note?: string;
}

export const COMPONENT_GUIDE: ComponentGuideEntry[] = [
  {
    type: 'stats_cards',
    displayName: 'Stats Cards',
    description: 'Displays key statistics as summary cards at the top of a page.',
    longDescription:
      'Shows configurable summary statistics as cards. Supports various stat types that can be scoped globally or to specific contexts. Use the gear icon to add, remove, and reorder cards.',
    category: 'dashboard',
    configOptions: [],
    exampleConfigs: [
      {
        label: 'Basic Stats',
        description: 'Key totals displayed as summary cards.',
        config: {
          cards: [
            { id: 'c1', type: 'total_count', label: 'Total' },
            { id: 'c2', type: 'active_count', label: 'Active' },
            { id: 'c3', type: 'completed_count', label: 'Completed' },
          ],
        },
      },
    ],
    requiresAuth: true,
  },
  {
    type: 'settings_panel',
    displayName: 'Settings Panel',
    description: 'User settings and preferences panel.',
    longDescription:
      'Provides a settings interface for configuring user preferences. Place on a dedicated settings page for easy access.',
    category: 'settings',
    configOptions: [],
    exampleConfigs: [
      {
        label: 'Default',
        description: 'Standard settings panel.',
        config: {},
      },
    ],
    requiresAuth: true,
  },
  {
    type: 'page_manager',
    displayName: 'Page Manager',
    description: 'Manages page structure and component layout.',
    longDescription:
      'The page manager is a special component that controls the layout and configuration of pages. It is rendered in the settings drawer rather than inline on the page.',
    category: 'settings',
    configOptions: [],
    exampleConfigs: [
      {
        label: 'Default',
        description: 'Page management interface.',
        config: {},
      },
    ],
    requiresAuth: true,
  },
];

export function getComponentGuide(type: string): ComponentGuideEntry | undefined {
  return COMPONENT_GUIDE.find((c) => c.type === type);
}

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  dashboard: { label: 'Dashboard', color: 'blue' },
  content: { label: 'Content', color: 'orange' },
  settings: { label: 'Settings', color: 'gray' },
};
