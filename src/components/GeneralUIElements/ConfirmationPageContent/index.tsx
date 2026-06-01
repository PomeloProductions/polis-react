import React, {PropsWithChildren} from 'react';
import './index.scss';

export interface ConfirmationPageContentProps {
    onConfirm: () => void,
    confirmText: string,
}

const ConfirmationPageContent: React.FC<PropsWithChildren<ConfirmationPageContentProps>> = ({onConfirm, confirmText, children}) => {

    return (
        <div className={'confirmation-page-content'}>
            <div className={'confirmation-page-content-details'}>
                {children}
            </div>
            <button onClick={onConfirm}>
                {confirmText}
            </button>
        </div>
    );
}

export default ConfirmationPageContent;
