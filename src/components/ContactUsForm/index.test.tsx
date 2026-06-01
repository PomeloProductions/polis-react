import { renderWithRouter } from '../../test-utils';
import ContactUsForm from './index';

test('renders ContactUsForm without crashing', () => {
  const { container } = renderWithRouter(<ContactUsForm />);
  expect(container).toBeTruthy();
});
