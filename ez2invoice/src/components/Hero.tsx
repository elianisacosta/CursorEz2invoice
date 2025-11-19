'use client';

import { ArrowRight, Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export default function Hero() {
  const [imageError, setImageError] = useState(false);
  
  return (
    <section className="relative bg-gray-900 overflow-hidden min-h-screen flex items-center">
      {/* Background Image with Blur - Optimized */}
      <div className="absolute inset-0">
        {!imageError ? (
          <Image
            src="/images/hero-semitruck-shop.jpg"
            alt="Truck repair shop"
            fill
            priority
            quality={50}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            className="object-cover blur-sm scale-110"
            sizes="100vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 z-10">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            The Complete Truck Shop
            <span className="block text-primary-400">Management Solution</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Streamline your truck service business with powerful tools for work orders, 
            customer management, inventory tracking, and more. Built specifically for 
            semi-truck repair shops.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <a
              href="/pricing"
              className="bg-primary-500 text-white px-8 py-4 rounded-lg hover:bg-primary-600 transition-colors font-semibold text-lg flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="/request-demo"
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-colors font-semibold text-lg flex items-center space-x-2 border border-white/30 hover:border-white/50"
            >
              <Play className="h-5 w-5" />
              <span>Request Demo</span>
            </a>
          </div>

          {/* Sub-text */}
          <p className="text-gray-300 text-sm drop-shadow-sm">
            Choose your plan and start managing your shop today.
          </p>
        </div>
      </div>
    </section>
  );
}
