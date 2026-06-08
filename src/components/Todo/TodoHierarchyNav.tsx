import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, Text, ActionIcon, Paper, Breadcrumbs, Anchor } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import { TodoContext } from '../../contexts/TodoContext';
import { UserPage } from '../../models/user/user-page';

interface TodoHierarchyNavProps {
  page: UserPage;
}

const TodoHierarchyNav: React.FC<TodoHierarchyNavProps> = ({ page }) => {
  const navigate = useNavigate();
  const { loadHierarchy, hierarchy } = useContext(TodoContext);
  const config = (page.config_json ?? {}) as Record<string, unknown>;
  const todoDate = config.todo_date as string | undefined;
  const todoYear = config.todo_year as number | undefined;
  const todoMonth = config.todo_month as number | undefined;
  const todoLevel = config.todo_level as string | undefined;

  useEffect(() => {
    if (todoYear) {
      void loadHierarchy(todoYear);
    }
  }, [todoYear, loadHierarchy]);

  // Find parent week from hierarchy for breadcrumb
  const findParentWeek = () => {
    if (!hierarchy || !todoMonth) return undefined;
    const month = hierarchy.months.find((m) => (m.config_json?.todo_month as number) === todoMonth);
    if (!month) return undefined;
    // For day pages, match by parent_page_id
    if (todoLevel === 'day' && page.parent_page_id) {
      return month.weeks.find((w) => w.id === page.parent_page_id);
    }
    // For week pages, match by week_start
    if (config.todo_week_start) {
      return month.weeks.find(
        (w) => (w.config_json?.todo_week_start as string) === config.todo_week_start,
      );
    }
    return undefined;
  };

  const breadcrumbs: { label: string; to?: string }[] = [];

  if (todoYear) {
    breadcrumbs.push({
      label: String(todoYear),
      to: `/todos/${todoYear}`,
    });
  }

  if (todoMonth && todoYear) {
    const monthName = new Date(todoYear, todoMonth - 1).toLocaleString('default', {
      month: 'long',
    });
    breadcrumbs.push({
      label: monthName,
      to: `/todos/${todoYear}/${String(todoMonth).padStart(2, '0')}`,
    });
  }

  if (todoLevel === 'week') {
    breadcrumbs.push({ label: page.name });
  } else if (todoLevel === 'day') {
    const parentWeek = findParentWeek();
    if (parentWeek) {
      breadcrumbs.push({
        label: parentWeek.name,
        to: `/todos/${parentWeek.slug}`,
      });
    }
  }

  if (todoDate && todoLevel === 'day') {
    const dateObj = new Date(todoDate + 'T00:00:00');
    breadcrumbs.push({
      label: dateObj.toLocaleDateString('default', {
        weekday: 'long',
        month: 'numeric',
        day: 'numeric',
      }),
    });
  }

  const handlePrevDay = () => {
    if (!todoDate) return;
    const d = new Date(todoDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    navigate(`/todos/date/${formatDate(d)}`);
  };

  const handleNextDay = () => {
    if (!todoDate) return;
    const d = new Date(todoDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    // Don't navigate into the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) return;
    navigate(`/todos/date/${formatDate(d)}`);
  };

  const isToday = (() => {
    if (!todoDate) return false;
    const d = new Date(todoDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  })();

  const dateValue = todoDate ? new Date(todoDate + 'T00:00:00') : undefined;
  const maxDate = new Date();
  maxDate.setHours(0, 0, 0, 0);

  return (
    <Paper p="sm" radius="md" withBorder mb="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {todoLevel === 'day' && (
            <ActionIcon variant="subtle" onClick={handlePrevDay} title="Previous day">
              <IconChevronLeft size={18} />
            </ActionIcon>
          )}
          <Breadcrumbs>
            {breadcrumbs.map((crumb, i) =>
              crumb.to && i < breadcrumbs.length - 1 ? (
                <Anchor
                  key={i}
                  size="sm"
                  component="a"
                  href={crumb.to}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(crumb.to!);
                  }}
                >
                  {crumb.label}
                </Anchor>
              ) : (
                <Text key={i} size="sm" fw={600}>
                  {crumb.label}
                </Text>
              ),
            )}
          </Breadcrumbs>
          {todoLevel === 'day' && (
            <ActionIcon
              variant="subtle"
              onClick={handleNextDay}
              title="Next day"
              disabled={isToday}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          )}
        </Group>
        <DatePickerInput
          value={dateValue}
          onChange={(date) => {
            if (!date) return;
            navigate(`/todos/date/${formatDate(date)}`);
          }}
          maxDate={maxDate}
          leftSection={<IconCalendar size={16} />}
          size="xs"
          w={160}
          placeholder="Jump to date"
          clearable
        />
      </Group>
    </Paper>
  );
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default TodoHierarchyNav;
