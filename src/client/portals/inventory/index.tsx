import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';


const theme = {
  primaryColor: 'green',
  colors: {
    green: [
      '#e8f8ef', '#c5edda', '#9fe0c3', '#74d3ac',
      '#50C878', '#3db366', '#2d9e52', '#1e8a3e',
      '#0f762b', '#006219',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'Inter, sans-serif',
};

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        {/* Inventory portal routes will go here */}
        <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ color: '#50C878' }}>Elegance by Sconia — Inventory</h1>
          <p>Scaffold placeholder. Implement dashboard pages next.</p>
        </div>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
