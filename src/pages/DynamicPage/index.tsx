import React, { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, Text, Group, ActionIcon, Drawer, Container } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { MeContext } from '../../contexts/MeContext';
import PageRenderer from '../../components/PageRenderer/index';
import PageSettingsPanel from '../../components/PageRenderer/PageSettingsPanel';
import { defaultPageTypeRegistry } from '../../util/page-type-registry';

const DefaultDynamicPage: React.FC = () => {
  const { pageSlug, param1 } = useParams<{ pageSlug?: string; param1?: string }>();
  const slug = pageSlug || 'home';
  const { pages, loading, refreshPages } = useContext(UserPagesContext);
  const { me } = useContext(MeContext);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading || !me?.id) {
    return <Loader size="md" />;
  }

  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    return <Text c="red">Page not found: {slug}</Text>;
  }

  // Build pageParams from route params and the page's route_path pattern
  const pageParams: Record<string, string> = {};
  if (param1) {
    const paramMatch = page.route_path.match(/:(\w+)/);
    if (paramMatch) {
      pageParams[paramMatch[1]] = param1;
    }
  }

  let displayTitle = page.name;
  if (param1 && !page.is_nav_item) {
    displayTitle = `${page.name} — ${param1}`;
  }

  return (
    <Container size={defaultPageTypeRegistry.resolveContainerSize(page.page_type)} py="xl">
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          {displayTitle}
        </Text>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => setSettingsOpen(true)}
          title="Page settings"
        >
          <IconSettings size={20} />
        </ActionIcon>
      </Group>
      <PageRenderer page={page} userId={me.id} pageParams={pageParams} onRefresh={refreshPages} />

      <Drawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        position="right"
        size="lg"
        styles={{ title: { fontSize: '1.25rem', fontWeight: 600 } }}
      >
        <PageSettingsPanel page={page} onRefresh={refreshPages} />
      </Drawer>
    </Container>
  );
};

export default DefaultDynamicPage;
