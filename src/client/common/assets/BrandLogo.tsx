import React from 'react';
import ebsLogo from './EBS_neww-01.jpeg';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  variant?: 'dark' | 'light';
  size?: Size;
}

const HEIGHTS: Record<Size, number> = { sm: 28, md: 95, lg: 48 };

const BrandLogo: React.FC<Props> = ({ size = 'md' }) => (
  <img
    src={ebsLogo}
    alt="Elegance by Sconia"
    height={HEIGHTS[size]}
    style={{ display: 'block' }}
  />
);

export default BrandLogo;
