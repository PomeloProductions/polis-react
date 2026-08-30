import { screen, fireEvent } from '@testing-library/react';
import Page from './index';
import { renderWithRouter } from '../../../test-utils';

describe('Page', () => {
  it('renders children content', () => {
    renderWithRouter(
      <Page>
        <div data-testid="test-content">Test Content</div>
      </Page>,
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders sidebar and navigation', () => {
    renderWithRouter(<Page />);

    // Check for sidebar (the AppShell navbar)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    // Home link lives in the sidebar
    const homeLink = document.querySelector('a[href="/"]');
    expect(homeLink).toBeInTheDocument();

    // Two responsive burgers (mobile + desktop) toggle the navigation.
    expect(screen.getAllByLabelText('Toggle navigation').length).toBeGreaterThan(0);
  });

  it('renders the provided title in the header and no placeholder by default', () => {
    const { unmount } = renderWithRouter(<Page />);
    // With no title prop there must be no hardcoded placeholder text.
    expect(screen.queryByText('Header Title')).not.toBeInTheDocument();
    unmount();

    renderWithRouter(<Page headerTitle="My App" />);
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('toggles the sidebar without removing page content when the burger is clicked', () => {
    renderWithRouter(
      <Page>
        <div data-testid="test-content">Test Content</div>
      </Page>,
    );

    const [toggleButton] = screen.getAllByLabelText('Toggle navigation');
    const sidebar = screen.getByTestId('sidebar');

    // Toggling the shell must never remove the content region (no reflow that
    // hides the page) or the sidebar element from the tree.
    fireEvent.click(toggleButton);
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
});
