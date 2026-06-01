import { render } from '@testing-library/react';
import LoadingIndicatorComponent from './'

test('renders Header without crashing', () => {
    const { baseElement } = render(<LoadingIndicatorComponent/>);
    expect(baseElement).toBeDefined();
});
