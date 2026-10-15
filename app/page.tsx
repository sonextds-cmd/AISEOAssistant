import SeoDashboard from '@/components/SeoDashboard';
import { UserMenu } from './components/user-menu';

export default function HomePage() {
  return <SeoDashboard userMenu={<UserMenu />} />;
}
