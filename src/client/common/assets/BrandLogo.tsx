import React from 'react';
import ebsLogo from './EBS_neww-01.jpeg';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: 'dark' | 'light';
  size?: Size;
}

const HEIGHTS: Record<Size, number> = { sm: 28, md: 95, lg: 48 };

const BrandLogo: React.FC<Props> = ({ size = 'sm' }) => (
  <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', maxWidth: '100%' }}>
    <img
    src={ebsLogo}
    alt="Elegance by Sconia"
    height={HEIGHTS[size]}
    style={{ display: 'block' }}
  />
  </div>
  
);

export default BrandLogo;
