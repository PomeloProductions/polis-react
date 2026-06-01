import { render } from '@testing-library/react';
import LoadingScreen from './index';

test('renders Input without crashing', () => {
    const { baseElement } = render(<LoadingScreen  text={'Loading'}/>);
    expect(baseElement).toBeDefined();
});
