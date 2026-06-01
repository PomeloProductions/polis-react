import Footnote from './index';
import { renderWithRouter } from '../../test-utils';

test('renders Footnote without crashing', () => {
    const { baseElement } = renderWithRouter(<Footnote>A title</Footnote>);
    expect(baseElement).toBeDefined();
});
