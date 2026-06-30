import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/space-grotesk/700.css';

const theme = {
  primaryColor: 'green',
  colors: {
    green: [
      '#e8f8ef', '#c5edda', '#9fe0c3', '#74d3ac',
      '#50C878', '#3db366', '#2d9e52', '#1e8a3e',
      '#0f762b', '#006219',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        {/* Store portal routes will go here — Phase 2 */}
        <div style={{ padding: '2rem', fontFamily: 'IBM Plex Sans, sans-serif' }}>
          <h1 style={{ color: '#50C878' }}>Elegance by Sconia</h1>
          <p>Phase 2 — Online store placeholder.</p>
        </div>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
