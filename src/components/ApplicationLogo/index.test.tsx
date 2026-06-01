import ApplicationLogo from './index';
import { renderWithRouter } from '../../test-utils';

test('renders ApplicationLogo without crashing', () => {
  const { container } = renderWithRouter(<ApplicationLogo />);
  expect(container).toBeTruthy();
});
