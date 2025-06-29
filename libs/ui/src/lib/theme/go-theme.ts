import { createTheme, MantineColorsTuple } from '@mantine/core';

// GO Game Color Palette
const goOrange: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffcc99',
  '#ffaa66',
  '#ff8833',
  '#f76707', // Primary orange
  '#e8590c',
  '#d9480f',
  '#c73b0a',
  '#b82906',
];

const goBlue: MantineColorsTuple = [
  '#e7f5ff',
  '#d0ebff',
  '#a5d8ff',
  '#74c0fc',
  '#339af0',
  '#228be6', // Primary blue
  '#1c7ed6',
  '#1971c2',
  '#1864ab',
  '#145294',
];

const goGreen: MantineColorsTuple = [
  '#ebfbee',
  '#d3f9d8',
  '#b2f2bb',
  '#8ce99a',
  '#69db7c',
  '#51cf66', // Primary green
  '#40c057',
  '#37b24d',
  '#2f9e44',
  '#2b8a3e',
];

// Board-specific colors
const boardColors = {
  classic: {
    board: '#DEB887', // Burlywood
    lines: '#8B4513', // Saddle brown
    starPoints: '#654321', // Dark brown
    background: '#F5E6D3', // Light beige
  },
  modern: {
    board: '#2C3E50', // Dark blue-gray
    lines: '#34495E', // Lighter blue-gray
    starPoints: '#1ABC9C', // Turquoise
    background: '#ECF0F1', // Light gray
  },
  zen: {
    board: '#8B7355', // Dark khaki
    lines: '#654321', // Dark brown
    starPoints: '#2F4F4F', // Dark slate gray
    background: '#F5F5DC', // Beige
  },
};

export const goTheme = createTheme({
  primaryColor: 'goOrange',
  colors: {
    goOrange,
    goBlue,
    goGreen,
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    sizes: {
      h1: { fontSize: '2.5rem', fontWeight: '700' },
      h2: { fontSize: '2rem', fontWeight: '600' },
      h3: { fontSize: '1.5rem', fontWeight: '600' },
      h4: { fontSize: '1.25rem', fontWeight: '500' },
    },
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        shadow: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'xs',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
  other: {
    // GO game specific theme values
    boardColors,
    stones: {
      black: '#1a1a1a',
      white: '#ffffff',
      blackShadow: 'rgba(0, 0, 0, 0.3)',
      whiteShadow: 'rgba(0, 0, 0, 0.2)',
    },
    animations: {
      stonePlacement: '0.2s ease-out',
      stoneCapture: '0.3s ease-in',
      boardTransition: '0.4s ease-in-out',
      uiTransition: '0.15s ease',
    },
  },
});

export type GoTheme = typeof goTheme;
export { boardColors };
