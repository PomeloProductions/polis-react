import React, { useEffect, PropsWithChildren } from 'react';
import './index.scss';

export interface ModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  title?: string;
  className?: string;
  overlayClassName?: string;
  contentLabel?: string;
}

const ContentModal: React.FC<PropsWithChildren<ModalProps>> = ({
  isOpen,
  onRequestClose,
  title,
  children,
  className = '',
  overlayClassName = '',
  contentLabel,
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="content-modal">
      <div 
        className={`modal-overlay ${overlayClassName}`} 
        onClick={onRequestClose} 
        data-testid="modal-overlay"
      >
        <div 
          className={`modal-content ${className}`}
          onClick={e => e.stopPropagation()}
          data-testid="modal-content"
          aria-label={contentLabel}
        >
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            <button 
              className="modal-close-button"
              onClick={onRequestClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentModal; 