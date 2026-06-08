import BaseModel from '../base-model';

export interface TodoTemplate extends BaseModel {
  user_id: number;
  name: string;
  level: 'year' | 'month' | 'week' | 'day';
  sections_json: SectionDefinition[];
}

export interface TodoSetting extends BaseModel {
  user_id: number;
  week_start_day: number;
  timezone: string;
}

export interface TimeEntry extends BaseModel {
  user_id: number;
  label: string;
  note?: string;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number;
  color?: string;
  /** Present on running timer entries created via timerStart */
  component_id?: number;
  item_id?: string;
  budget_hours?: number;
  session_budget_hours?: number;
  todo_balance_id?: number;
  session_elapsed_seconds?: number;
}

export interface SectionDefinition {
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
}

export type OnCopyBehavior = 'reset' | 'increment' | 'preserve';

export interface TodoItem {
  id: string;
  text: string;
  tally?: number;
  on_copy: OnCopyBehavior;
  completed?: boolean;
  last_date?: string;
  sub_items?: TodoItem[];
}

export interface PriorityGroup {
  group_number: number;
  label?: string;
  count_this_group: number;
  on_copy?: OnCopyBehavior;
  items: TodoItem[];
}

export interface TimeBudget {
  hours: number;
  schedule?: string;
}

export interface TimeTrackerProject {
  id: string;
  name: string;
  budgeted_hours: number;
  logged_hours: number;
  deficit: number;
}

export interface TodoBalance {
  id: number;
  user_id: number;
  item_key: string;
  tracking_mode: 'units' | 'hours';
  balance: number;
  time_budget_hours: number | null;
  tally_step: number;
  schedule: number[] | null;
}

export interface TodoHierarchyDay {
  id: number;
  name: string;
  slug: string;
  config_json: Record<string, unknown>;
}

export interface TodoHierarchyWeek {
  id: number;
  name: string;
  slug: string;
  config_json: Record<string, unknown>;
  days: TodoHierarchyDay[];
}

export interface TodoHierarchyMonth {
  id: number;
  name: string;
  slug: string;
  config_json: Record<string, unknown>;
  weeks: TodoHierarchyWeek[];
}

export interface TodoHierarchy {
  id: number;
  name: string;
  slug: string;
  config_json: Record<string, unknown>;
  months: TodoHierarchyMonth[];
}
