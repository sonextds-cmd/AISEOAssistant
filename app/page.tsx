import SeoDashboard from '@/components/SeoDashboard';
import { UserMenu } from './components/user-menu';

export default function HomePage() {
  return (
    <div>
      <div className="flex justify-end p-4 bg-gray-50 border-b">
        <UserMenu />
      </div>
      <SeoDashboard />
    </div>
  );
}
