import React, { useState } from 'react';
import { Group, Text, NumberInput } from '@mantine/core';
import './index.scss';

export interface RangeFilterValue {
    min: string;
    max: string;
    searchValue: string;
}

interface RangeFilterProps {
    columnId: string;
    onFilterChange: (columnId: string, value: RangeFilterValue | null) => void;
}

/**
 * A reusable filter function for range-based filtering
 * @param value The value to check
 * @param filterValue The filter value containing min and max
 * @returns boolean indicating if the value passes the filter
 */
export const rangeFilterFn = (value: number | undefined | null, filterValue: RangeFilterValue): boolean => {
    // If no filter is applied, show all rows
    if (!filterValue.min && !filterValue.max) return true;
    
    // If a filter is applied, hide rows with no value
    if (value === undefined || value === null) return false;
    
    if (filterValue.min && value < parseFloat(filterValue.min)) return false;
    if (filterValue.max && value > parseFloat(filterValue.max)) return false;
    return true;
};

const RangeFilter: React.FC<RangeFilterProps> = ({ columnId, onFilterChange }) => {
    const [min, setMin] = useState<string>('');
    const [max, setMax] = useState<string>('');

    const handleMinChange = (value: string | number) => {
        const newMin = value.toString();
        setMin(newMin);
        updateFilter(newMin, max);
    };

    const handleMaxChange = (value: string | number) => {
        const newMax = value.toString();
        setMax(newMax);
        updateFilter(min, newMax);
    };

    const updateFilter = (newMin: string, newMax: string) => {
        if (!newMin && !newMax) {
            onFilterChange(columnId, null);
        } else {
            const searchValue = `between,${newMin || '0'},${newMax || '100'}`;
            onFilterChange(columnId, {
                min: newMin,
                max: newMax,
                searchValue
            });
        }
    };

    return (
        <Group gap="xs" align="center" style={{ whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
            <NumberInput
                placeholder="Min"
                onChange={handleMinChange}
                size="xs"
                min={0}
                step={0.1}
                hideControls
                style={{ width: '60px' }}
            />
            <Text size="xs">-</Text>
            <NumberInput
                placeholder="Max"
                onChange={handleMaxChange}
                size="xs"
                min={0}
                step={0.1}
                hideControls
                style={{ width: '60px' }}
            />
        </Group>
    );
};

export default RangeFilter; 