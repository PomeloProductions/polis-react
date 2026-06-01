import ContentModal from './index';
import { render, screen, fireEvent } from '@testing-library/react';

describe('ContentModal', () => {
    const mockOnRequestClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing when isOpen is false', () => {
        render(
            <ContentModal isOpen={false} onRequestClose={mockOnRequestClose}>
                <div>Modal Content</div>
            </ContentModal>
        );

        expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('renders content when isOpen is true', () => {
        render(
            <ContentModal isOpen={true} onRequestClose={mockOnRequestClose}>
                <div>Modal Content</div>
            </ContentModal>
        );

        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('calls onRequestClose when clicking outside the modal', () => {
        render(
            <ContentModal
                isOpen={true}
                onRequestClose={mockOnRequestClose}
            >
                <div>Modal Content</div>
            </ContentModal>
        );

        fireEvent.click(screen.getByTestId('modal-overlay'));
        expect(mockOnRequestClose).toHaveBeenCalled();
    });

    it('does not call onRequestClose when clicking inside the modal', () => {
        render(
            <ContentModal isOpen={true} onRequestClose={mockOnRequestClose}>
                <div>Modal Content</div>
            </ContentModal>
        );

        fireEvent.click(screen.getByText('Modal Content'));
        expect(mockOnRequestClose).not.toHaveBeenCalled();
    });

    it('renders with custom className', () => {
        render(
            <ContentModal isOpen={true} onRequestClose={mockOnRequestClose} className="custom-class">
                <div>Modal Content</div>
            </ContentModal>
        );

        expect(screen.getByTestId('modal-content')).toHaveClass('custom-class');
    });

    it('renders with custom overlayClassName', () => {
        render(
            <ContentModal isOpen={true} onRequestClose={mockOnRequestClose} overlayClassName="custom-overlay">
                <div>Modal Content</div>
            </ContentModal>
        );

        expect(screen.getByTestId('modal-overlay')).toHaveClass('custom-overlay');
    });

    it('renders with custom contentLabel', () => {
        render(
            <ContentModal
                isOpen={true}
                onRequestClose={mockOnRequestClose}
                contentLabel="Custom Label"
            >
                <div>Modal Content</div>
            </ContentModal>
        );

        expect(screen.getByLabelText('Custom Label')).toBeInTheDocument();
    });
}); 