import React, {PropsWithChildren} from 'react';
import './index.scss';

interface Props extends PropsWithChildren<unknown> {
    className?: string,
}

const BottomStickySection: React.FC<Props> = ({ className, children }) => {

    return (
        <div className={'bottom-sticky-section ' + className}>
            {children}
        </div>
    )
}

export default BottomStickySection
