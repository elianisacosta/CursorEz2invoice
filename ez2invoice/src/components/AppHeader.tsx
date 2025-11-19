'use client';

import Link from 'next/link';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function AppHeader() {
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
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Marketing Site</span>
            </Link>
            <Link
              href="/dashboard"
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
