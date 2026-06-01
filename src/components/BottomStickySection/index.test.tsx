import { render } from '@testing-library/react';
import BottomStickySection from './index';

test('renders Input without crashing', () => {
    const { baseElement } = render(<BottomStickySection/>);
    expect(baseElement).toBeDefined();
});
