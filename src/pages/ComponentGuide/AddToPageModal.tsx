import React, { useContext, useState } from 'react';
import { Modal, Stack, Text, Select, Button, Group, Alert, Code } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { notifications } from '@mantine/notifications';

interface AddToPageModalProps {
  opened: boolean;
  onClose: () => void;
  componentType: string;
  componentDisplayName: string;
  config: Record<string, unknown>;
}

const AddToPageModal: React.FC<AddToPageModalProps> = ({
  opened,
  onClose,
  componentType,
  componentDisplayName,
  config,
}) => {
  const { pages, addComponent } = useContext(UserPagesContext);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pageOptions = pages.map((p) => ({
    value: String(p.id),
    label: p.name,
    group: p.page_type === 'detail' ? 'Detail Pages' : 'Pages',
  }));

  const handleAdd = async () => {
    if (!selectedPageId) return;
    const pageId = parseInt(selectedPageId, 10);

    setSaving(true);
    try {
      await addComponent(pageId, {
        component_type: componentType,
        config_json: config,
      });
      notifications.show({
        title: 'Component added',
        message: `${componentDisplayName} has been added to the selected page.`,
        color: 'green',
      });
      onClose();
      setSelectedPageId(null);
    } catch (err) {
      console.error('Failed to add component', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to add component to page.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasConfig = Object.keys(config).length > 0;

  return (
    <Modal opened={opened} onClose={onClose} title="Add to Page" centered>
      <Stack gap="md">
        <Text size="sm">
          Add <strong>{componentDisplayName}</strong> to one of your pages. The current playground
          configuration will be saved with the component.
        </Text>

        {hasConfig && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="xs" mb={4} fw={600}>
              Config that will be saved:
            </Text>
            <Code block style={{ fontSize: 11 }}>
              {JSON.stringify(config, null, 2)}
            </Code>
          </Alert>
        )}

        <Select
          label="Select a page"
          placeholder="Choose a page..."
          data={pageOptions}
          value={selectedPageId}
          onChange={setSelectedPageId}
          searchable
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedPageId} loading={saving}>
            Add to Page
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AddToPageModal;
