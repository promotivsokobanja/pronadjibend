import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Prijava',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
