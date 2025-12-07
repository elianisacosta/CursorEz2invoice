'use client';

import { useRouter } from 'next/navigation';
import { Wrench, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-primary-500" />
              <div>
                <span className="text-xl font-bold text-gray-800">EZ2Invoice</span>
                <span className="text-sm text-gray-500 ml-2">Shop Management</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
