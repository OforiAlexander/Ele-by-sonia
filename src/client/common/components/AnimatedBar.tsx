import React from 'react';

interface Props {
  pct:    string;
  color:  string;
  delay:  string;
  active: boolean;
}

const AnimatedBar: React.FC<Props> = ({ pct, color, delay, active }) => (
  <div className="bar-track">
    <div
      className="bar-fill"
      style={{
        width:      active ? pct : '0%',
        background: color,
        transition: `width .9s cubic-bezier(.22,.9,.31,1) ${delay}`,
      }}
    />
  </div>
);

export default AnimatedBar;
