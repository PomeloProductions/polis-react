import React, { useEffect, useRef, useState, useMemo } from 'react';
import './index.scss';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getFilteredRowModel,
  ColumnFiltersState,
  getSortedRowModel,
  SortingState,
  Row,
  Column,
  AccessorKeyColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  Text,
  Paper,
  TextInput,
  Stack,
  ActionIcon,
  rem,
  Loader,
  Checkbox,
} from '@mantine/core';
import { IconArrowUp, IconArrowDown, IconArrowsUpDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import RangeFilter, { RangeFilterValue, rangeFilterFn } from './RangeFilter';
import { BasePaginatedContextState } from '../../../contexts/BasePaginatedContext';
import BaseModel from '../../../models/base-model';

export interface RangeFilterColumn<T> {
  valueCallback?: (row: T) => number | undefined | null;
  disableServerSearch?: boolean;
}

export interface DataListProps<T extends BaseModel> {
  context: BasePaginatedContextState<T>;
  columns: AccessorKeyColumnDef<T>[];
  onRowClick?: (row: T) => void;
  onArrangeData?: (data: T[]) => T[];
  onFilterChanged?: (columnId: string, value: unknown) => boolean;
  rowIdField?: keyof T;
  detailPath?: string;
  rangeFields?: Record<string, RangeFilterColumn<T>>;
  dataTestId?: string;
  bulkSelectEnabled?: boolean;
  onBulkSelect?: (id: number) => void;
  selectedItems?: Set<number>;
}

const handleTableFilter = <T extends BaseModel>(
  row: Row<T>,
  columnId: string,
  value: unknown,
  rangeFields: Record<string, RangeFilterColumn<T>>,
): boolean => {
  if (!value) return true;

  const cellValue = row.getValue(columnId);
  if (!cellValue) return false;

  if (rangeFields[columnId]) {
    const filterValue = value as RangeFilterValue;

    let valueToCheck: number | undefined | null;
    const rangeField = rangeFields[columnId];
    if (rangeField?.valueCallback) {
      valueToCheck = rangeField.valueCallback(row.original);
    } else {
      valueToCheck = cellValue as number;
    }

    return rangeFilterFn(valueToCheck, filterValue);
  }

  return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
};

const DataList = <T extends BaseModel>({
  context,
  columns,
  onRowClick,
  onArrangeData,
  onFilterChanged,
  rowIdField = 'id' as keyof T,
  detailPath,
  rangeFields = {},
  dataTestId = 'data-table',
  bulkSelectEnabled = false,
  onBulkSelect,
  selectedItems = new Set(),
}: DataListProps<T>) => {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastRowRef = useRef<HTMLTableRowElement | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [maxResults, setMaxResults] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Update maxResults when total changes
  useEffect(() => {
    if (context.total && context.total > maxResults) {
      setMaxResults(context.total);
    }
  }, [context.total, maxResults]);

  // Sync input values with column filters
  useEffect(() => {
    const newInputValues: Record<string, string> = {};
    columnFilters.forEach((filter) => {
      newInputValues[filter.id] = filter.value as string;
    });
    setInputValues(newInputValues);
  }, [columnFilters]);

  const handleTableFilterChange = (
    updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => {
    const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    setColumnFilters(newFilters);

    // If we have all data loaded, just use table filtering
    if (context.loadedData.length >= maxResults) {
      return;
    }

    // Otherwise update context filters
    newFilters.forEach((filter: { id: string; value: unknown }) => {
      if (onFilterChanged && onFilterChanged(filter.id, filter.value)) {
        return;
      }
      const val = filter.value;
      let finalValue: string | number | null | undefined;

      if (typeof val === 'string' || typeof val === 'number') {
        finalValue = val || null; // Handles empty strings and 0 becoming null
      } else if (val === null || val === undefined) {
        finalValue = val; // val is already null or undefined
      } else {
        // For booleans, objects, and any other types, pass null.
        finalValue = null;
      }
      context.setFilter(filter.id, finalValue);
    });
  };

  const handleTextFilterChange = (column: Column<T, unknown>, value: string | undefined) => {
    // Update table filter state
    const newFilters = columnFilters.filter((f) => f.id !== column.id);
    if (value) {
      newFilters.push({ id: column.id, value: value });
    }

    setColumnFilters(newFilters);
    if (onFilterChanged && column.id && onFilterChanged(column.id, value)) {
      return;
    }

    if (context.loadedData.length >= maxResults) {
      return;
    }

    const key = (column.columnDef as AccessorKeyColumnDef<T, unknown>).accessorKey as string;
    if (key) {
      context.setFilter(key, value ? 'like,*' + value + '*' : null);
    }
  };

  const handleFilterChange = (columnId: string, value: RangeFilterValue | null) => {
    // Update table filter state
    const newFilters = columnFilters.filter((f) => f.id !== columnId);
    if (value) {
      newFilters.push({ id: columnId, value });
    }
    setColumnFilters(newFilters);

    if (onFilterChanged && onFilterChanged(columnId, value?.searchValue || null)) {
      return;
    }

    // Don't update server filters if we have all data or if disableServerSearch is true
    if (context.loadedData.length >= maxResults || rangeFields[columnId]?.disableServerSearch) {
      return;
    }

    const key = columns.find((col) => col.id === columnId)?.accessorKey as string;
    if (key) {
      context.setFilter(key, value?.searchValue || null);
    }
  };

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);

    // If we have all data loaded, just use table sorting
    if (context.loadedData.length >= maxResults) {
      return;
    }

    // Otherwise update context order
    if (newSorting.length > 0) {
      const { id, desc } = newSorting[0];
      // Find the column definition
      const key = columns.find((col) => col.id === id)?.accessorKey as string;

      context.setOrder(key, desc ? 'DESC' : 'ASC');
    } else {
      // Clear all sorting
      Object.keys(context.order).forEach((key) => {
        context.setOrder(key, null);
      });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !context.refreshing && context.hasAnotherPage) {
          context.loadNext();
        }
      },
      { threshold: 0.5 },
    );

    observerRef.current = observer;

    if (lastRowRef.current) {
      observer.observe(lastRowRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [context.refreshing, context.hasAnotherPage, context.loadNext, context]);

  const tableData = useMemo(() => {
    return onArrangeData ? onArrangeData(context.loadedData) : context.loadedData;
  }, [context.loadedData, onArrangeData]);

  const table = useReactTable({
    data: tableData,
    columns: columns.map((col) => ({
      ...col,
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: (row: Row<T>, columnId: string, value: unknown) =>
        handleTableFilter(row, columnId, value, rangeFields),
    })),
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: handleTableFilterChange,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableSortingRemoval: true,
    sortDescFirst: false,
  });

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    } else if (detailPath && row[rowIdField]) {
      navigate(`${detailPath}/${row[rowIdField]}`);
    }
  };

  const handleBulkSelect = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onBulkSelect) {
      onBulkSelect(id);
    }
  };

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder data-testid={dataTestId}>
      <Stack gap="md">
        {context.refreshing ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader data-testid="loading-spinner" />
          </div>
        ) : (
          <Table
            striped
            highlightOnHover
            borderColor="gray.3"
            data-testid="data-table-content"
            styles={{
              th: {
                padding: rem(12),
                backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-gray-0))',
                borderBottom: '2px solid var(--polis-color-border, var(--mantine-color-gray-3))',
                fontFamily: 'var(--polis-font-heading, inherit)',
              },
              td: {
                padding: rem(12),
                fontFamily: 'var(--polis-font-body, inherit)',
                color: 'var(--polis-color-text-primary, inherit)',
              },
              tr: {
                '&:hover': {
                  backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-gray-0))',
                },
              },
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <React.Fragment key={headerGroup.id}>
                  <tr>
                    {bulkSelectEnabled && <th style={{ width: '40px' }} />}
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.id === 'actions' ? null : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text fw={600} size="sm" c="dimmed">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={header.column.getToggleSortingHandler()}
                              color="gray"
                            >
                              {{
                                asc: <IconArrowUp size={16} />,
                                desc: <IconArrowDown size={16} />,
                              }[header.column.getIsSorted() as string] ?? (
                                <IconArrowsUpDown size={16} />
                              )}
                            </ActionIcon>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {bulkSelectEnabled && <th />}
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.id === 'actions' ? null : rangeFields[header.id] ? (
                          <RangeFilter columnId={header.id} onFilterChange={handleFilterChange} />
                        ) : (
                          <TextInput
                            placeholder={`Filter ${header.column.columnDef.header as string}`}
                            value={inputValues[header.id] ?? ''}
                            onChange={(event) =>
                              handleTextFilterChange(header.column, event.target.value)
                            }
                            size="xs"
                            variant="filled"
                            styles={{
                              input: {
                                backgroundColor:
                                  'var(--polis-color-surface-alt, var(--mantine-color-gray-0))',
                                borderColor:
                                  'var(--polis-color-border, var(--mantine-color-gray-3))',
                                fontFamily: 'var(--polis-font-body, inherit)',
                                '&:focus': {
                                  borderColor:
                                    'var(--polis-color-primary, var(--mantine-color-blue-6))',
                                },
                              },
                            }}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                  style={{ cursor: onRowClick || detailPath ? 'pointer' : 'default' }}
                  data-testid={`row-${row.original[rowIdField]}`}
                  ref={index === table.getRowModel().rows.length - 1 ? lastRowRef : undefined}
                >
                  {bulkSelectEnabled && (
                    <td onClick={(e) => handleBulkSelect(row.original[rowIdField] as number, e)}>
                      <Checkbox
                        checked={selectedItems.has(row.original[rowIdField] as number)}
                        onChange={() => {}}
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
};

export default DataList;
