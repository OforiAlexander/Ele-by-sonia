import React from 'react';

const AppLoader: React.FC = () => (
  <div className="app-loader">
    <div className="app-loader-ring-wrap">
      <div className="app-loader-arc" />
      <span className="app-loader-initials">EBS</span>
    </div>
  </div>
);

export default AppLoader;
