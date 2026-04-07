"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#003D7C", // Azul UChile
      light: "#1565C0",
      dark: "#002855",
    },
    secondary: {
      main: "#6D6E71",
      light: "#9E9E9E",
      dark: "#424242",
    },
    background: {
      default: "#F5F5F5",
      paper: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});
