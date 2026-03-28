'use client';

import { StrictMode } from 'react';

export default function StrictModeProvider({ children }) {
  return <StrictMode>{children}</StrictMode>;
}
