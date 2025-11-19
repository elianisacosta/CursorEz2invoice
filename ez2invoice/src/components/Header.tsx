'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Wrench, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from './AuthForm';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Get auth context - hooks must be called unconditionally
  // The context will handle loading states internally
  const auth = useAuth();
  const user = auth?.user || null;
  const signOut = auth?.signOut || (async () => {});

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold text-gray-800">EZ2Invoice</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-primary-500 smooth-transition" prefetch={true}>
              Home
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-primary-500 smooth-transition" prefetch={true}>
              Pricing
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary-500 smooth-transition" prefetch={true}>
              Contact
            </Link>
            <Link href="/faq" className="text-gray-700 hover:text-primary-500 smooth-transition" prefetch={true}>
              FAQ
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="h-5 w-5" />
                  <span className="text-sm">
                    {user.user_metadata?.first_name || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-primary-500 transition-colors flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-500 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/pricing"
                  className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-primary-500 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 smooth-transition"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                Home
              </Link>
              <Link
                href="/pricing"
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 smooth-transition"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 smooth-transition"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                Contact
              </Link>
              <Link
                href="/faq"
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 smooth-transition"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                FAQ
              </Link>
              <div className="border-t pt-3 mt-3">
                {user ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2 text-gray-700 mb-3">
                      <User className="h-5 w-5" />
                      <span className="text-sm">
                        {user.user_metadata?.first_name || user.email}
                      </span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-gray-700 hover:text-primary-500 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-3 py-2 text-gray-700 hover:text-primary-500 transition-colors w-full text-left"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/pricing"
                      className="block mx-3 mt-2 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium text-center w-auto"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Auth Form Modal */}
      {showAuthForm && (
        <AuthForm onClose={() => setShowAuthForm(false)} />
      )}
    </header>
  );
}
