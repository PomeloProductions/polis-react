import React, { useState } from 'react';
import {
  Stack,
  Switch,
  TextInput,
  NumberInput,
  Select,
  MultiSelect,
  Textarea,
  Text,
  Paper,
  Divider,
} from '@mantine/core';
import { ConfigOption } from './componentMetadata';

interface ConfigEditorProps {
  options: ConfigOption[];
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ options, config, onChange }) => {
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  if (options.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        This component has no configuration options.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {options.map((opt, i) => (
        <React.Fragment key={opt.key}>
          {i > 0 && <Divider />}
          <Paper p="sm" radius="sm" bg="gray.0">
            <Text size="xs" c="dimmed" mb={4}>
              <code>{opt.key}</code>
            </Text>
            <Text size="sm" fw={500} mb={4}>
              {opt.label}
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              {opt.description}
            </Text>

            {opt.type === 'boolean' && (
              <Switch
                checked={(config[opt.key] as boolean) ?? (opt.default as boolean) ?? false}
                onChange={(e) => set(opt.key, e.currentTarget.checked)}
                label={
                  ((config[opt.key] as boolean) ?? (opt.default as boolean) ?? false)
                    ? 'Enabled'
                    : 'Disabled'
                }
              />
            )}

            {opt.type === 'string' && (
              <TextInput
                value={(config[opt.key] as string) ?? (opt.default as string) ?? ''}
                onChange={(e) => set(opt.key, e.currentTarget.value)}
                placeholder={`Enter ${opt.label.toLowerCase()}...`}
              />
            )}

            {opt.type === 'number' && (
              <NumberInput
                value={(config[opt.key] as number) ?? (opt.default as number) ?? 0}
                onChange={(v) => set(opt.key, v)}
              />
            )}

            {opt.type === 'select' && opt.options && (
              <Select
                value={(config[opt.key] as string) ?? (opt.default as string) ?? null}
                onChange={(v) => set(opt.key, v)}
                data={opt.options}
                clearable={false}
              />
            )}

            {opt.type === 'multiselect' && opt.options && (
              <MultiSelect
                value={(config[opt.key] as string[]) ?? (opt.default as string[]) ?? []}
                onChange={(v) => set(opt.key, v)}
                data={opt.options}
              />
            )}

            {opt.type === 'json' && (
              <Textarea
                value={
                  config[opt.key] !== undefined
                    ? JSON.stringify(config[opt.key], null, 2)
                    : JSON.stringify(opt.default ?? [], null, 2)
                }
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.currentTarget.value);
                    set(opt.key, parsed);
                    setJsonErrors((prev) => {
                      const next = { ...prev };
                      delete next[opt.key];
                      return next;
                    });
                  } catch {
                    setJsonErrors((prev) => ({
                      ...prev,
                      [opt.key]: 'Invalid JSON',
                    }));
                  }
                }}
                autosize
                minRows={3}
                maxRows={8}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                error={jsonErrors[opt.key]}
              />
            )}
          </Paper>
        </React.Fragment>
      ))}
    </Stack>
  );
};

export default ConfigEditor;
