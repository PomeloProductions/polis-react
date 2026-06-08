import { screen, fireEvent, render } from '@testing-library/react';
import DataList from '.';
import { MantineProvider } from '@mantine/core';
import { BasePaginatedContextState , defaultBaseContext } from '../../../contexts/BasePaginatedContext';
import BaseModel from '../../../models/base-model';
import { CellContext } from '@tanstack/react-table';
import { PolisProvider } from '../../PolisProvider';
import type { PolisTheme } from '../../../theme/PolisTheme';

const makeTheme = (primary: string, body: string): PolisTheme => ({
    name: `t-${primary}`,
    colors: {
        primary,
        primaryHover: primary,
        primaryActive: primary,
        surface: '#fff',
        surfaceAlt: '#eee',
        textPrimary: '#111',
        textMuted: '#666',
        border: '#ccc',
        success: '#0a0',
        warning: '#aa0',
        danger: '#a00',
        info: '#00a',
    },
    fonts: { body, heading: body, mono: body },
    radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
    spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

// Mock useNavigate
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
}));

interface TestItem extends BaseModel {
    name: string;
    date: string;
    score: number;
}

const columns = [
    {
        accessorKey: 'name',
        header: 'Name',
    },
    {
        accessorKey: 'date',
        header: 'Date',
        cell: (info: CellContext<TestItem, unknown>) => new Date(info.getValue() as string).toLocaleDateString(),
    },
    {
        accessorKey: 'score',
        header: 'Score',
        cell: (info: CellContext<TestItem, unknown>) => (info.getValue() as number).toFixed(1),
        meta: {
            filterType: 'range'
        }
    },
];

const renderWithMantine = (component: React.ReactNode) => {
    return render(
        <MantineProvider>
            {component}
        </MantineProvider>
    );
};

describe('DataList', () => {
    const mockContext: BasePaginatedContextState<TestItem> = {
        ...defaultBaseContext(),
        loadedData: [],
        total: 0,
        refreshing: false,
        hasAnotherPage: false,
        initialLoadComplete: true,
        initiated: true,
        noResults: false,
        expands: [],
        order: {},
        filter: {},
        search: {},
        limit: 20,
        loadAll: false,
        params: {},
        lastLoadedPage: undefined,
        loadNext: jest.fn(),
        refreshData: jest.fn(),
        setFilter: jest.fn(),
        setSearch: jest.fn(),
        setOrder: jest.fn(),
        addModel: jest.fn(),
        removeModel: jest.fn(),
        getModel: jest.fn()
    };

    const mockColumns = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'date', header: 'Date' },
        { accessorKey: 'score', header: 'Score' }
    ];

    it('handles empty data', () => {
        renderWithMantine(
            <DataList
                context={mockContext}
                columns={columns}
            />
        );
        const tableBody = screen.getByTestId('data-table-content').querySelector('tbody');
        expect(tableBody?.children.length).toBe(0);
    });

    it('renders data table with provided data', () => {
        const data: TestItem[] = [
            { id: 1, name: 'Test Item 1', date: '2024-01-01', score: 100, created_at: '', updated_at: '' },
            { id: 2, name: 'Test Item 2', date: '2024-01-02', score: 200, created_at: '', updated_at: '' }
        ];

        const contextWithData = {
            ...mockContext,
            loadedData: data,
            total: 2
        };

        renderWithMantine(
            <DataList
                context={contextWithData}
                columns={mockColumns}
            />
        );

        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });

    it('uses range filter for score column when rangeFields is provided', () => {
        const onFilterChanged = jest.fn();
        renderWithMantine(
            <DataList
                context={mockContext}
                columns={columns}
                rangeFields={{ score: {} }}
                onFilterChanged={onFilterChanged}
            />
        );

        const minInput = screen.getByPlaceholderText('Min');
        const maxInput = screen.getByPlaceholderText('Max');

        fireEvent.change(minInput, { target: { value: '100' } });
        expect(onFilterChanged).toHaveBeenCalledWith('score', 'between,100,100');

        fireEvent.change(maxInput, { target: { value: '200' } });
        expect(onFilterChanged).toHaveBeenCalledWith('score', 'between,100,200');
    });

    it('renders inside PolisProvider with theme A', () => {
        const theme = makeTheme('#aa00aa', 'Body-A');
        render(
            <PolisProvider theme={theme}>
                <DataList
                    context={mockContext}
                    columns={columns}
                />
            </PolisProvider>
        );
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#aa00aa');
        expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-A');
    });

    it('renders inside PolisProvider with theme B and reflects swapped token', () => {
        const theme = makeTheme('#00aa00', 'Body-B');
        render(
            <PolisProvider theme={theme}>
                <DataList
                    context={mockContext}
                    columns={columns}
                />
            </PolisProvider>
        );
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#00aa00');
        expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-B');
    });

    it('handles bulk selection when enabled', () => {
        const onBulkSelect = jest.fn();
        const data: TestItem[] = [
            { id: 1, name: 'Test Item 1', date: '2024-01-01', score: 100, created_at: '', updated_at: '' }
        ];

        const contextWithData = {
            ...mockContext,
            loadedData: data,
            total: 1
        };

        renderWithMantine(
            <DataList
                context={contextWithData}
                columns={columns}
                bulkSelectEnabled={true}
                onBulkSelect={onBulkSelect}
            />
        );

        const checkbox = screen.getByTestId('row-1').querySelector('input[type="checkbox"]');
        expect(checkbox).toBeInTheDocument();
        fireEvent.click(checkbox!);
        
        expect(onBulkSelect).toHaveBeenCalledWith(1);
    });
}); 