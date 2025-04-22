// File: constants/theme.ts
import React from 'react';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#121212',
    surface: '#1e1e1e',
    primary: '#0a84ff',
    text: '#ffffff',
    outline: '#444',
  },
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
};
