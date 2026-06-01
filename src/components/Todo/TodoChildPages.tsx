import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Paper, Text, SimpleGrid } from '@mantine/core';
import { TodoContext } from '../../contexts/TodoContext';
import { UserPage } from '../../models/user/user-page';

interface TodoChildPagesProps {
    page: UserPage;
}

const TodoChildPages: React.FC<TodoChildPagesProps> = ({ page }) => {
    const navigate = useNavigate();
    const { hierarchy, loadHierarchy } = useContext(TodoContext);
    const config = (page.config_json ?? {}) as Record<string, unknown>;
    const todoLevel = config.todo_level as string | undefined;
    const todoYear = config.todo_year as number | undefined;
    const todoMonth = config.todo_month as number | undefined;
    const todoWeekStart = config.todo_week_start as string | undefined;

    useEffect(() => {
        if (todoYear) {
            void loadHierarchy(todoYear);
        }
    }, [todoYear, loadHierarchy]);

    if (!hierarchy) return null;

    // Year page -> show months
    if (todoLevel === 'year') {
        return (
            <Stack gap="sm" mt="md">
                <Text fw={600} size="lg">Months</Text>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
                    {hierarchy.months.map((month) => (
                        <Paper
                            key={month.id}
                            p="md"
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/todos/${month.slug}`)}
                        >
                            <Text fw={500}>{month.name}</Text>
                            <Text size="xs" c="dimmed">
                                {month.weeks.length} weeks
                            </Text>
                        </Paper>
                    ))}
                </SimpleGrid>
            </Stack>
        );
    }

    // Month page -> show weeks
    if (todoLevel === 'month') {
        const month = hierarchy.months.find(
            (m) => (m.config_json?.todo_month as number) === todoMonth
        );
        if (!month) return null;

        return (
            <Stack gap="sm" mt="md">
                <Text fw={600} size="lg">Weeks</Text>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {month.weeks.map((week) => (
                        <Paper
                            key={week.id}
                            p="md"
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/todos/${week.slug}`)}
                        >
                            <Text fw={500}>{week.name}</Text>
                            <Text size="xs" c="dimmed">
                                {week.days.length} days
                            </Text>
                        </Paper>
                    ))}
                </SimpleGrid>
            </Stack>
        );
    }

    // Week page -> show days
    if (todoLevel === 'week') {
        const month = hierarchy.months.find(
            (m) => (m.config_json?.todo_month as number) === todoMonth
        );
        const week = month?.weeks.find(
            (w) => (w.config_json?.todo_week_start as string) === todoWeekStart
        );
        if (!week) return null;

        return (
            <Stack gap="sm" mt="md">
                <Text fw={600} size="lg">Days</Text>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 7 }}>
                    {week.days.map((day) => (
                        <Paper
                            key={day.id}
                            p="md"
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/todos/${day.slug}`)}
                        >
                            <Text fw={500} size="sm">{day.name}</Text>
                        </Paper>
                    ))}
                </SimpleGrid>
            </Stack>
        );
    }

    return null;
};

export default TodoChildPages;
