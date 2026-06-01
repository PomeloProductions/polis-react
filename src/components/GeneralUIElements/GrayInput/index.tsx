import React, { PropsWithChildren} from 'react'
import './index.scss';

type Props = {}

const GrayInput: React.FC<PropsWithChildren<Props>> = ({ children }) => {
	return (
		<div className={'gray-input'}>
			{children}
		</div>
	)
}

export default GrayInput
