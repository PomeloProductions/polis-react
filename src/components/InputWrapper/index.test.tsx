import { render } from '@testing-library/react';
import Input from './index';

test('renders Input without crashing', () => {
    const { baseElement } = render(<Input  label={'A Label'}/>);
    expect(baseElement).toBeDefined();
});