import React, { PropsWithChildren } from 'react'
import './index.scss';

type Props = {}

const UnderlinedInput: React.FC<PropsWithChildren<Props>> = ({ children }) => {
	return (
		<div className={'underlined-input'}>
			{children}
		</div>
	)
}

export default UnderlinedInput
