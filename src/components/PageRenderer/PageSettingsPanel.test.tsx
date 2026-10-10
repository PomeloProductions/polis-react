import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

let userPagesValue: {
  pages: unknown[];
  editPage: jest.Mock;
  addPage: jest.Mock;
  removePage: jest.Mock;
  addComponent: jest.Mock;
  editComponent: jest.Mock;
  removeComponent: jest.Mock;
};

jest.mock('../../contexts/UserPagesContext', () => {
  const React = jest.requireActual('react');
  const UserPagesContext = React.createContext({});
  return { __esModule: true, UserPagesContext };
});

// The drag-and-drop library is only used for the Pages section; stub it so the
// panel renders without a real DnD runtime.
jest.mock('@hello-pangea/dnd', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    DragDropContext: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Droppable: ({
      children,
    }: {
      children: (provided: {
        innerRef: () => void;
        droppableProps: Record<string, unknown>;
        placeholder: null;
      }) => React.ReactNode;
    }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
    Draggable: ({
      children,
    }: {
      children: (provided: {
        innerRef: () => void;
        draggableProps: Record<string, unknown>;
        dragHandleProps: Record<string, unknown>;
      }) => React.ReactNode;
    }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }),
  };
});

import PageSettingsPanel from './PageSettingsPanel';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { UserPage, UserPageComponent } from '../../models/user/user-page';

const makeComponent = (
  overrides: Partial<UserPageComponent> & Pick<UserPageComponent, 'id' | 'display_order'>,
): UserPageComponent =>
  ({
    user_page_id: 1,
    component_type: 'stats_cards',
    config_json: null,
    ...overrides,
  }) as UserPageComponent;

const makePage = (components: UserPageComponent[]): UserPage =>
  ({
    id: 1,
    slug: 'home',
    name: 'Home',
    icon: 'home',
    color: null,
    route_path: 'home',
    page_type: 'dashboard',
    display_order: 0,
    is_visible: true,
    is_required: false,
    is_nav_item: true,
    parent_page_id: null,
    config_json: null,
    components,
  }) as UserPage;

const renderPanel = (
  props: Partial<React.ComponentProps<typeof PageSettingsPanel>> = {},
  page?: UserPage,
) =>
  render(
    <MantineProvider>
      <UserPagesContext.Provider value={userPagesValue as never}>
        <PageSettingsPanel
          page={page ?? makePage([])}
          onRefresh={props.onRefresh ?? jest.fn()}
          {...props}
        />
      </UserPagesContext.Provider>
    </MantineProvider>,
  );

beforeEach(() => {
  userPagesValue = {
    pages: [],
    editPage: jest.fn().mockResolvedValue({}),
    addPage: jest.fn().mockResolvedValue({}),
    removePage: jest.fn().mockResolvedValue(undefined),
    addComponent: jest.fn().mockResolvedValue({}),
    editComponent: jest.fn().mockResolvedValue({}),
    removeComponent: jest.fn().mockResolvedValue(undefined),
  };
});

describe('PageSettingsPanel component reordering', () => {
  const twoComponents = () => [
    makeComponent({ id: 10, display_order: 0 }),
    makeComponent({ id: 20, display_order: 1 }),
  ];

  test('renders up/down arrows for each component row', () => {
    renderPanel({}, makePage(twoComponents()));
    expect(screen.getAllByLabelText('Move component up')).toHaveLength(2);
    expect(screen.getAllByLabelText('Move component down')).toHaveLength(2);
  });

  test('up is disabled on the first component, down is disabled on the last', () => {
    renderPanel({}, makePage(twoComponents()));
    const ups = screen.getAllByLabelText('Move component up');
    const downs = screen.getAllByLabelText('Move component down');

    // First row: up disabled, down enabled.
    expect(ups[0]).toBeDisabled();
    expect(downs[0]).not.toBeDisabled();

    // Last row: up enabled, down disabled.
    expect(ups[1]).not.toBeDisabled();
    expect(downs[1]).toBeDisabled();
  });

  test('clicking down on the first component swaps it with its neighbor via editComponent', async () => {
    const onRefresh = jest.fn();
    renderPanel({ onRefresh }, makePage(twoComponents()));

    const downs = screen.getAllByLabelText('Move component down');
    await act(async () => {
      fireEvent.click(downs[0]);
    });

    await waitFor(() => {
      expect(userPagesValue.editComponent).toHaveBeenCalled();
    });

    // After moving the first (id 10, order 0) down, the second (id 20) should
    // take order 0 and the first should take order 1.
    expect(userPagesValue.editComponent).toHaveBeenCalledWith(1, 20, { display_order: 0 });
    expect(userPagesValue.editComponent).toHaveBeenCalledWith(1, 10, { display_order: 1 });
    expect(onRefresh).toHaveBeenCalled();
  });

  test('clicking up on the last component swaps the other direction via editComponent', async () => {
    const onRefresh = jest.fn();
    renderPanel({ onRefresh }, makePage(twoComponents()));

    const ups = screen.getAllByLabelText('Move component up');
    await act(async () => {
      fireEvent.click(ups[1]);
    });

    await waitFor(() => {
      expect(userPagesValue.editComponent).toHaveBeenCalled();
    });

    // Moving the last (id 20, order 1) up puts id 20 at order 0 and id 10 at order 1.
    expect(userPagesValue.editComponent).toHaveBeenCalledWith(1, 20, { display_order: 0 });
    expect(userPagesValue.editComponent).toHaveBeenCalledWith(1, 10, { display_order: 1 });
    expect(onRefresh).toHaveBeenCalled();
  });
});
