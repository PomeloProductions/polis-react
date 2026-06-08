import React, { PropsWithChildren } from 'react';
import MeContextProvider from '../contexts/MeContext';

const AuthenticatedRoute: React.FC<PropsWithChildren> = ({ children }) => {
  return <MeContextProvider>{children}</MeContextProvider>;
};

export default AuthenticatedRoute;
