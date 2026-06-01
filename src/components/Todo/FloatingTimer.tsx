import React, { useContext, useState, useRef, useEffect } from 'react';
import { Paper, Text, Group, ActionIcon, Progress, Transition, TextInput, Stack, ScrollArea } from '@mantine/core';
import { IconPlayerStop, IconCheck } from '@tabler/icons-react';
import { TimerContext, TimerSession } from '../../contexts/TimerContext';
import { MeContext } from '../../contexts/MeContext';

function formatTime(totalSeconds: number): string {
    const abs = Math.abs(totalSeconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClockTime(epochMs: number, use24h: boolean): string {
    const d = new Date(epochMs);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    if (use24h) return `${String(h).padStart(2, '0')}:${m}`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

const SessionRow: React.FC<{
    session: TimerSession;
    sessionBudgetSeconds: number;
    sessionSeconds: number;
}> = ({ session, sessionBudgetSeconds, sessionSeconds }) => {
    return (
        <Stack gap={2}>
            <Group justify="space-between">
                <Group gap={4}>
                    {session.completed && <IconCheck size={12} color="var(--mantine-color-green-6)" />}
                    <Text size="xs" fw={session.completed ? 500 : 400} c={session.completed ? undefined : 'dimmed'}>
                        {session.label}
                    </Text>
                </Group>
                <Text size="xs" c={session.completed ? 'green' : 'dimmed'} fw={session.completed ? 600 : undefined}>
                    {formatTime(sessionSeconds)} / {formatTime(sessionBudgetSeconds)}
                </Text>
            </Group>
            <Progress
                value={session.progressPct}
                color={session.completed ? 'green' : 'blue'}
                size="sm"
                radius="xl"
            />
        </Stack>
    );
};

const FloatingTimer: React.FC = () => {
    const { activeTimer, elapsedSeconds, sessionSeconds, sessions, stopTimer, updateStartTime } = useContext(TimerContext);
    const { me } = useContext(MeContext);
    const use24h = me.time_format === '24h';
    const [editingStart, setEditingStart] = useState(false);
    const [startText, setStartText] = useState('');

    const isActive = !!activeTimer;
    const sessionBudgetHours = activeTimer?.target.sessionBudgetHours ?? 0;
    const sessionBudgetSeconds = sessionBudgetHours * 3600;
    const budgetHours = activeTimer?.target.budgetHours ?? 0;
    const hasSessions = sessions.length > 0 && sessionBudgetSeconds > 0;

    // Balance bar for hours-mode tasks (balanceHours is only set for hours-mode)
    const balanceHours = activeTimer?.target.balanceHours;
    const hasBalance = balanceHours != null;
    const elapsedHours = elapsedSeconds / 3600;
    const effectiveBalanceHours = hasBalance ? balanceHours! + elapsedHours : 0;
    const isBehind = hasBalance && effectiveBalanceHours < 0;
    const isAhead = hasBalance && effectiveBalanceHours >= 0;
    const deficitSeconds = hasBalance && balanceHours! < 0 ? Math.round(Math.abs(balanceHours!) * 3600) : 0;
    const balancePct = deficitSeconds > 0 ? Math.min((elapsedSeconds / deficitSeconds) * 100, 100) : (isAhead ? 100 : 0);
    const balanceRemainingSeconds = Math.round(Math.abs(effectiveBalanceHours) * 3600);

    // Units-mode total budget balance — only counts current session (capped at session budget)
    const hasUnitsBudget = !hasBalance && budgetHours > 0;
    const totalBudgetSeconds = budgetHours * 3600;
    const cappedSessionSeconds = sessionBudgetSeconds > 0 ? Math.min(sessionSeconds, sessionBudgetSeconds) : sessionSeconds;
    const totalRemaining = totalBudgetSeconds - cappedSessionSeconds;
    const totalOver = totalRemaining <= 0;
    const totalPct = totalBudgetSeconds > 0 ? Math.min((cappedSessionSeconds / totalBudgetSeconds) * 100, 100) : 0;

    const commitStartTime = () => {
        if (!activeTimer) { setEditingStart(false); return; }
        const text = startText.trim();
        const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
        const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        let hours: number | null = null;
        let minutes: number | null = null;
        if (match24) {
            hours = parseInt(match24[1], 10);
            minutes = parseInt(match24[2], 10);
        } else if (match12) {
            hours = parseInt(match12[1], 10);
            minutes = parseInt(match12[2], 10);
            const isPM = match12[3].toUpperCase() === 'PM';
            if (hours === 12) hours = isPM ? 12 : 0;
            else if (isPM) hours += 12;
        }
        if (hours != null && minutes != null && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const d = new Date(activeTimer.startTime);
            d.setHours(hours, minutes, 0, 0);
            const newStart = Math.min(d.getTime(), Date.now());
            updateStartTime(newStart);
        }
        setEditingStart(false);
    };

    const timerRef = useRef<HTMLDivElement>(null);
    const [timerHeight, setTimerHeight] = useState(0);
    useEffect(() => {
        if (timerRef.current) {
            setTimerHeight(timerRef.current.offsetHeight);
        }
    });

    const hasAnyBar = hasSessions || hasBalance || hasUnitsBudget;

    return (
        <>
        {isActive && <div style={{ height: timerHeight + 48 }} />}
        <Transition mounted={isActive} transition="slide-up" duration={200}>
            {(styles) => (
                <Paper
                    ref={timerRef}
                    shadow="lg"
                    p="md"
                    radius="md"
                    withBorder
                    style={{
                        ...styles,
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1000,
                        minWidth: 300,
                        maxWidth: 360,
                    }}
                >
                    <Group justify="space-between" mb="xs">
                        <Text fw={600} size="sm" lineClamp={1} style={{ maxWidth: 220 }}>
                            {activeTimer?.target.label}
                        </Text>
                        <ActionIcon
                            variant="filled"
                            color="red"
                            size="sm"
                            onClick={stopTimer}
                            title="Stop timer"
                        >
                            <IconPlayerStop size={14} />
                        </ActionIcon>
                    </Group>
                    <Group justify="space-between" mb={hasAnyBar ? 'xs' : 0}>
                        <Text size="xs" c="dimmed">
                            Elapsed: <Text span fw={600}>{formatTime(elapsedSeconds)}</Text>
                        </Text>
                        <Group gap={4} wrap="nowrap" align="center">
                            <Text size="xs" c="dimmed">Started:</Text>
                            {editingStart ? (
                                <TextInput
                                    value={startText}
                                    size="xs"
                                    w={use24h ? 70 : 100}
                                    autoFocus
                                    placeholder={use24h ? 'HH:MM' : 'H:MM AM'}
                                    styles={{ input: { textAlign: 'center', padding: '0 4px', fontSize: 'var(--mantine-font-size-xs)' } }}
                                    onChange={(e) => setStartText(e.target.value)}
                                    onBlur={commitStartTime}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitStartTime();
                                        if (e.key === 'Escape') setEditingStart(false);
                                    }}
                                />
                            ) : (
                                <Text
                                    size="xs"
                                    fw={600}
                                    style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                    onClick={() => {
                                        if (activeTimer) {
                                            setStartText(formatClockTime(activeTimer.startTime, use24h));
                                            setEditingStart(true);
                                        }
                                    }}
                                    title="Click to edit start time"
                                >
                                    {activeTimer ? formatClockTime(activeTimer.startTime, use24h) : '--:--'}
                                </Text>
                            )}
                        </Group>
                    </Group>

                    {/* Balance progress bar for hours-mode tasks */}
                    {hasBalance && (
                        <Stack gap={4} mb={hasSessions ? 'xs' : 0}>
                            <Group justify="space-between">
                                {isBehind ? (
                                    <>
                                        <Text size="xs" c="dimmed">
                                            {formatTime(elapsedSeconds)} / {formatTime(deficitSeconds)}
                                        </Text>
                                        <Text size="xs" c="red" fw={600}>
                                            Behind: {formatTime(balanceRemainingSeconds)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text size="xs" c="dimmed">Caught up</Text>
                                        <Text size="xs" c="green" fw={600}>
                                            +{formatTime(balanceRemainingSeconds)}
                                        </Text>
                                    </>
                                )}
                            </Group>
                            <Progress
                                value={balancePct}
                                color={isAhead ? 'green' : 'blue'}
                                size="sm"
                                radius="xl"
                            />
                        </Stack>
                    )}

                    {/* Session progress (shown first) */}
                    {hasSessions && (
                        <ScrollArea.Autosize mah={180} mb={hasUnitsBudget ? 'xs' : 0}>
                            <Stack gap={6}>
                                {sessions.map((session) => (
                                    <SessionRow
                                        key={session.index}
                                        session={session}
                                        sessionBudgetSeconds={sessionBudgetSeconds}
                                        sessionSeconds={sessionSeconds}
                                    />
                                ))}
                            </Stack>
                        </ScrollArea.Autosize>
                    )}

                    {/* Units-mode total budget bar (below session) */}
                    {hasUnitsBudget && (
                        <Stack gap={4}>
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed">
                                    {formatTime(cappedSessionSeconds)} / {formatTime(totalBudgetSeconds)}
                                </Text>
                                <Text size="xs" c={totalOver ? 'green' : 'dimmed'} fw={totalOver ? 600 : undefined}>
                                    {totalOver ? 'Done!' : `Left: ${formatTime(totalRemaining)}`}
                                </Text>
                            </Group>
                            <Progress
                                value={totalPct}
                                color={totalOver ? 'green' : 'blue'}
                                size="xs"
                                radius="xl"
                            />
                        </Stack>
                    )}
                </Paper>
            )}
        </Transition>
        </>
    );
};

export default FloatingTimer;
