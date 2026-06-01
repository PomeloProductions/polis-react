import { screen, fireEvent, render } from '@testing-library/react';
import DataList from '.';
import { MantineProvider } from '@mantine/core';
import { BasePaginatedContextState } from '../../../contexts/BasePaginatedContext';
import { defaultBaseContext } from '../../../contexts/BasePaginatedContext';
import BaseModel from '../../../models/base-model';
import { CellContext } from '@tanstack/react-table';

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