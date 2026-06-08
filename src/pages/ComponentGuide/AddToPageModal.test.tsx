import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

const notificationsShowMock = jest.fn();
jest.mock('@mantine/notifications', () => ({
  notifications: { show: (...args: unknown[]) => notificationsShowMock(...args) },
}));

let userPagesValue: {
  pages: Array<{ id: number; name: string; page_type: string }>;
  addComponent: jest.Mock;
};
jest.mock('../../contexts/UserPagesContext', () => {
  const React = jest.requireActual('react');
  const UserPagesContext = React.createContext<{
    pages: unknown[];
    addComponent: unknown;
  }>({ pages: [], addComponent: () => Promise.resolve({}) });
  return { __esModule: true, UserPagesContext };
});

// Substitute Mantine's Select with a plain HTML <select> so we can
// programmatically pick an option without dealing with the upstream
// Combobox quirks.
jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  const React = jest.requireActual('react');
  const Select: React.FC<{
    label?: string;
    placeholder?: string;
    data?: Array<{ value: string; label: string }>;
    value?: string | null;
    onChange?: (v: string | null) => void;
  }> = ({ label, placeholder, data = [], value, onChange }) =>
    React.createElement(
      'div',
      null,
      label && React.createElement('label', null, label),
      React.createElement(
        'select',
        {
          'aria-label': label,
          'data-testid': 'page-select',
          value: value ?? '',
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange?.(e.currentTarget.value || null),
        },
        [
          React.createElement('option', { key: '__none', value: '' }, placeholder),
          ...data.map((item) =>
            React.createElement('option', { key: item.value, value: item.value }, item.label),
          ),
        ],
      ),
    );
  return { ...actual, Select };
});

import AddToPageModal from './AddToPageModal';
import { UserPagesContext } from '../../contexts/UserPagesContext';

const renderModal = (props: Partial<React.ComponentProps<typeof AddToPageModal>> = {}) =>
  render(
    <MemoryRouter>
      <MantineProvider>
        <UserPagesContext.Provider value={userPagesValue as never}>
          <AddToPageModal
            opened
            onClose={props.onClose ?? jest.fn()}
            componentType="stats_cards"
            componentDisplayName="Stats Cards"
            config={props.config ?? { some: 'value' }}
            {...props}
          />
        </UserPagesContext.Provider>
      </MantineProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  userPagesValue = {
    pages: [
      { id: 1, name: 'Home', page_type: 'dashboard' },
      { id: 2, name: 'Things', page_type: 'detail' },
    ],
    addComponent: jest.fn().mockResolvedValue({}),
  };
  notificationsShowMock.mockReset();
});

describe('AddToPageModal', () => {
  test('shows config preview when config has keys', () => {
    renderModal({ config: { foo: 'bar' } });
    expect(screen.getByText(/Config that will be saved/i)).toBeInTheDocument();
  });

  test('hides config preview when config is empty', () => {
    renderModal({ config: {} });
    expect(screen.queryByText(/Config that will be saved/i)).not.toBeInTheDocument();
  });

  test('Add button disabled until a page is selected', () => {
    renderModal();
    const addBtn = screen.getByRole('button', { name: 'Add to Page' });
    expect(addBtn).toBeDisabled();
  });

  test('Cancel calls onClose', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  test('calling addComponent + showing success notification on add', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    const select = screen.getByTestId('page-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '1' } });
    const addBtn = screen.getByRole('button', { name: 'Add to Page' });
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await waitFor(() => {
      expect(userPagesValue.addComponent).toHaveBeenCalledWith(1, {
        component_type: 'stats_cards',
        config_json: { some: 'value' },
      });
    });
    await waitFor(() => {
      expect(notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green' }),
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('shows error notification when addComponent throws', async () => {
    userPagesValue.addComponent.mockRejectedValueOnce(new Error('boom'));
    const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderModal();
    const select = screen.getByTestId('page-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '1' } });
    const addBtn = screen.getByRole('button', { name: 'Add to Page' });
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await waitFor(() => {
      expect(notificationsShowMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });
    consoleErr.mockRestore();
  });

  test('no-op when add clicked with nothing selected', async () => {
    renderModal();
    // The button is disabled — clicking is a no-op, but we still
    // assert addComponent is not invoked.
    const addBtn = screen.getByRole('button', { name: 'Add to Page' });
    fireEvent.click(addBtn);
    expect(userPagesValue.addComponent).not.toHaveBeenCalled();
  });
});
