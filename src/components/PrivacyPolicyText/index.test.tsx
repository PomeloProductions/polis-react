import PrivacyPolicyText from './index';
import { renderWithRouter } from '../../test-utils';

test('renders Input without crashing', () => {
    const { baseElement } = renderWithRouter(<PrivacyPolicyText />);
    expect(baseElement).toBeDefined();
});
