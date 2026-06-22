import React, { useEffect, useRef } from 'react';

interface Props {
  onToken: (token: string) => void;
  onExpired: () => void;
  siteKey: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      render?: (el: HTMLElement, options: Record<string, unknown>) => number;
      reset?: (widgetId: number) => void;
      getResponse?: (widgetId: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

const RecaptchaWidget: React.FC<Props> = ({ onToken, onExpired, siteKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const renderWidget = () => {
      if (!containerRef.current || !mountedRef.current) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha!.render!(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': onExpired,
      });
    };

    if (typeof window.grecaptcha !== 'undefined' && window.grecaptcha.render) {
      renderWidget();
    } else {
      window.onRecaptchaLoad = renderWidget;

      if (!document.querySelector('script[src*="recaptcha"]')) {
        const script = document.createElement('script');
        script.src =
          'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      mountedRef.current = false;
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
};

export default RecaptchaWidget;
