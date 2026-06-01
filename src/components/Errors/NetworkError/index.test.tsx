import { screen } from '@testing-library/react';
import NetworkError from './index';
import { renderWithRouter } from '../../../test-utils';

describe('NetworkError', () => {
    it('renders the error message and icon', () => {
        renderWithRouter(<NetworkError />);
        
        // Check for error message
        expect(screen.getByText('Unable to Connect')).toBeInTheDocument();
        expect(screen.getByText('It looks like there was an issue connecting to the server. Please check your connection and try again.')).toBeInTheDocument();
        
        // Check for icon
        expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });
});
