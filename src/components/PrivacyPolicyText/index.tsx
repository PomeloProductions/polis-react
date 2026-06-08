import React from 'react'
import { usePolisTheme } from '../PolisProvider'

interface PrivacyPolicyTextProps {}

const PrivacyPolicyText: React.FC<PrivacyPolicyTextProps> = () => {
	const theme = usePolisTheme()
	return (
		<section
			className={'privacy-policy-text'}
			style={{
				fontFamily: `var(--polis-font-body, ${theme.fonts.body})`,
				color: `var(--polis-color-text-primary, ${theme.colors.textPrimary})`,
			}}
		>
			{/*TODO Privacy Policy Output*/}
		</section>
	)
}

export default PrivacyPolicyText
