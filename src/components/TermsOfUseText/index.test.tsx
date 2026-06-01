import TermsOfUseText from './index';
import { renderWithRouter } from '../../test-utils';

test('renders Input without crashing', () => {
    const { baseElement } = renderWithRouter(<TermsOfUseText />);
    expect(baseElement).toBeDefined();
});
