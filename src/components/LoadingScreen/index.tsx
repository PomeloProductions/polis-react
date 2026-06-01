import React from 'react'
import './index.scss';

interface Props {
	text?: string
}

const LoadingScreen: React.FC<Props> = ({  text }) => {
	return (
		<div id={'loading-screen'}>
			<div id={'loading-wrapper'}>
				<p>{text ? text : 'Loading'}</p>
			</div>
		</div>
	)
}

export default LoadingScreen
