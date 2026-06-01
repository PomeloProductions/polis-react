import React, {HTMLAttributes} from 'react';
import './index.scss';

interface OwnProps extends HTMLAttributes<HTMLImageElement> {
}

interface ApplicationLogoProps extends OwnProps {
}

const ApplicationLogo: React.FC<ApplicationLogoProps> = ()  => (
	<img className={'application-logo'} src={'/assets/images/main-logo.svg'} alt={''}/>
)

export default ApplicationLogo;
