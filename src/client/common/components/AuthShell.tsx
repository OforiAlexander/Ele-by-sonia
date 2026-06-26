import React from 'react';
import AuthBrand from './AuthBrand';
import BrandLogo from '@client/common/assets/BrandLogo';

interface Props {
  children: React.ReactNode;
}

const AuthShell: React.FC<Props> = ({ children }) => (
  <div className="auth-shell">
    <AuthBrand />
    <div className="auth-form-panel">
      <div className="auth-form-inner">
        <div className="auth-mobile-logo">
          <BrandLogo variant="light" size="md" />
        </div>
        <div className="auth-card">{children}</div>
      </div>
    </div>
  </div>
);

export default AuthShell;
