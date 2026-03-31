import LiveGuestClient from './LiveGuestClient';

export default function LiveGuestPage({ params }) {
  return <LiveGuestClient bandId={params.id} />;
}
