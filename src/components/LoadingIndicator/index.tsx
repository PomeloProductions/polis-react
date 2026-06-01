import './index.scss';
import React from 'react'
import {connect} from '../../data/connect';

interface StateProps {
	loadingCount: number;
}

interface OwnProps {
}

interface LoadingIndicatorComponentProps extends OwnProps, StateProps {}

const LoadingIndicatorComponent: React.FC<LoadingIndicatorComponentProps> = ({loadingCount }) => {
	let className = "lds-ripple ";
	if (loadingCount > 0) {
		className+= 'visible';
	}
	return (
		<div className={className} slot={'end'}>
			<div></div>
			<div></div>
		</div>
	)
}
export default connect<OwnProps, StateProps, {}>({
	mapStateToProps: (state) => ({
		loadingCount: state.session.loadingCount
	}),
	component: LoadingIndicatorComponent
});
