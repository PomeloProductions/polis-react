import React from 'react'
import { usePolisTheme } from '../PolisProvider'

const TermsOfUseText: React.FC = () => {
	const theme = usePolisTheme()
	return (
		<section
			className={'terms-of-use-text'}
			style={{
				fontFamily: `var(--polis-font-body, ${theme.fonts.body})`,
				color: `var(--polis-color-text-primary, ${theme.colors.textPrimary})`,
			}}
		>
			{/*TODO Terms of Use Output*/}
		</section>
	)
}

export default TermsOfUseText
