import React from 'react';
import BrandLogo from '@client/common/assets/BrandLogo';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const CheckMark: React.FC = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
    <path
      d="M1.5 4.5L4 7L9.5 1.5"
      stroke="#E3A92B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AuthBrand: React.FC = () => {
  const bullets = [
    t(KEYS.auth.brand.bullet1),
    t(KEYS.auth.brand.bullet2),
    t(KEYS.auth.brand.bullet3),
  ];

  return (
    <aside className="auth-brand">
      <div className="auth-brand-blob" />
      <div className="auth-brand-blob-2" />

      <div className="auth-brand-content">
        <BrandLogo variant="dark" size="md" />

        <h2 className="auth-brand-headline">
          {t(KEYS.auth.brand.headline)}<br />{t(KEYS.auth.brand.headlineAccent)}
        </h2>
        <p className="auth-brand-sub">{t(KEYS.auth.brand.sub)}</p>

        <ul className="auth-bullets" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {bullets.map((text) => (
            <li className="auth-bullet" key={text}>
              <div className="auth-bullet-check">
                <CheckMark />
              </div>
              <span className="auth-bullet-text">{text}</span>
            </li>
          ))}
        </ul>

        <div className="auth-brand-quote">
          <p className="auth-brand-quote-text">{t(KEYS.auth.brand.quote)}</p>
          <p className="auth-brand-quote-attr">{t(KEYS.auth.brand.quoteAttr)}</p>
        </div>
      </div>
    </aside>
  );
};

export default AuthBrand;
