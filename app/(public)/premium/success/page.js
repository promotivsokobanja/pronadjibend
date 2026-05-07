import { redirect } from 'next/navigation';

export default function PremiumSuccessPage() {
  redirect('/upgrade');
}
