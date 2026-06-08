import React from 'react';
import { Navigate } from 'react-router-dom';
import { TokenState } from '../../data/persistent/persistent.state';
import { connect } from '../../data/connect';

interface OwnProps {
  children?: React.ReactNode;
}

interface StateProps {
  tokenData?: TokenState;
}

interface AuthenticatedRouteProps extends OwnProps, StateProps {}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children, tokenData }) => {
  if (!tokenData) {
    return <Navigate to="/splash" replace />;
  }
  return <>{children}</>;
};

export default connect<OwnProps, StateProps, {}>({
  mapStateToProps: (state) => ({
    tokenData: state.persistent.tokenData,
  }),
  component: AuthenticatedRoute,
});
