# Hero Background Image Setup

## Current Implementation

The Hero component now includes a blurred background image with the following features:

- **Full-screen hero section** with `min-h-screen`
- **Blurred background image** with 8px blur effect
- **Dark overlay** (60% opacity) for better text readability
- **Drop shadows** on text for better contrast
- **Glass-morphism button** for the "Request Demo" button
- **Responsive design** that works on all devices

## Image Source

Currently using a placeholder truck shop image from Unsplash. To use your specific image:

### Option 1: Replace with Your Image URL
1. Upload your truck image to a hosting service (Imgur, Cloudinary, etc.)
2. Replace the `backgroundImage` URL in `Hero.tsx` with your image URL

### Option 2: Use Local Image
1. Save your truck image as `truck-shop-bg.jpg` in the `public/images/` folder
2. Update the `backgroundImage` URL to: `url("/images/truck-shop-bg.jpg")`

## Current Styling Features

- **Blur Effect**: 8px blur with 1.1x scale for seamless edges
- **Text Shadows**: Drop shadows on all text for readability
- **Glass Button**: Semi-transparent "Request Demo" button with backdrop blur
- **Responsive**: Adapts to all screen sizes
- **Performance**: Optimized with CSS transforms and filters

## Customization Options

You can adjust these values in `Hero.tsx`:

- **Blur Amount**: Change `filter: 'blur(8px)'` to `blur(4px)` for less blur
- **Overlay Opacity**: Change `bg-black/60` to `bg-black/40` for lighter overlay
- **Scale**: Change `transform: 'scale(1.1)'` to `scale(1.05)` for less scaling
- **Text Shadows**: Modify `drop-shadow-lg` classes for different shadow effects
