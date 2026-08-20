import React, { useContext, useEffect, useState } from 'react';
import { Paper, Group, Stack, Text, Switch } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { MeContext } from '../../contexts/MeContext';
import {
  getVacationStatus,
  setVacationStatus,
  VacationStatus,
} from '../../services/requests/TodoRequests';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface VacationControlProps {
  /** Called after the vacation state changes (e.g. so a page can refresh derived displays). */
  onChange?: () => void;
}

/**
 * Toggle vacation on/off and schedule an optional end date. Self-contained (fetches its own
 * status), so it can be dropped anywhere — the Calendars page and the Today/Day summary both use it.
 */
const VacationControl: React.FC<VacationControlProps> = ({ onChange }) => {
  const { me } = useContext(MeContext);
  const [onVacation, setOnVacation] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = (data: VacationStatus) => {
    setOnVacation(data.on_vacation);
    setStart(data.current_period?.start_date ?? null);
    setEnd(data.current_period?.end_date ?? null);
  };

  useEffect(() => {
    if (!me?.id) return;
    getVacationStatus(me.id)
      .then((r) => apply(r.data))
      .catch(console.error);
  }, [me?.id]);

  const toggle = async (next: boolean) => {
    if (!me?.id) return;
    setOnVacation(next); // optimistic
    setSaving(true);
    try {
      const r = await setVacationStatus(me.id, next);
      apply(r.data);
      onChange?.();
    } catch (e) {
      console.error('Failed to update vacation status', e);
      setOnVacation(!next); // revert
    } finally {
      setSaving(false);
    }
  };

  const setEndDate = async (d: Date | null) => {
    if (!me?.id) return;
    const ed = d ? toDateStr(d) : null;
    setEnd(ed); // optimistic
    setSaving(true);
    try {
      const r = await setVacationStatus(me.id, true, ed);
      apply(r.data);
      onChange?.();
    } catch (e) {
      console.error('Failed to set vacation end date', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder p="sm" radius="md" bg={onVacation ? 'orange.0' : undefined}>
      <Group justify="space-between" wrap="nowrap" align="center">
        <Stack gap={2}>
          <Text fw={600} size="sm">
            On vacation
          </Text>
          <Text size="xs" c="dimmed">
            {onVacation
              ? `Vacation since ${start ? start.slice(0, 10) : 'today'}${end ? ` until ${end.slice(0, 10)}` : ''} — calendars marked "paused on vacation" won't accrue.`
              : 'Turn on while away. Calendars not active on vacation stop accruing their daily totals.'}
          </Text>
        </Stack>
        <Group gap="md" wrap="nowrap" align="flex-end">
          {onVacation && (
            <DatePickerInput
              label="Ends"
              placeholder="Open-ended"
              size="xs"
              w={150}
              clearable
              disabled={saving}
              minDate={start ? new Date(start.slice(0, 10) + 'T00:00:00') : undefined}
              value={end ? new Date(end.slice(0, 10) + 'T00:00:00') : null}
              onChange={setEndDate}
            />
          )}
          <Switch
            size="md"
            checked={onVacation}
            disabled={saving}
            onChange={(e) => toggle(e.currentTarget.checked)}
          />
        </Group>
      </Group>
    </Paper>
  );
};

export default VacationControl;
