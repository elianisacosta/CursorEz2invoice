# How to Add Your Red Semi-Truck Image

## Step 1: Save Your Image

1. **Right-click** on the red semi-truck image you want to use
2. **Save it** to your computer
3. **Rename it** to `truck-shop-bg.jpg` (or keep the original name)

## Step 2: Add to Your Project

1. **Copy the image file** to: `ez2invoice/public/images/`
2. **Make sure the filename** matches what's in the code: `truck-shop-bg.jpg`

## Step 3: Alternative Filenames

If your image has a different name, update the Hero component:

**Current code:**
```typescript
backgroundImage: 'url("/images/truck-shop-bg.jpg")'
```

**If your image is named differently, change it to:**
```typescript
backgroundImage: 'url("/images/YOUR_IMAGE_NAME.jpg")'
```

## Step 4: Supported Formats

Your image can be:
- `.jpg` or `.jpeg`
- `.png`
- `.webp`

## Step 5: Test

1. **Start your development server**: `npm run dev`
2. **Go to**: `http://localhost:3000`
3. **You should see** your red semi-truck image blurred in the background

## Current Setup

The Hero component is already configured with:
- ✅ **Blur effect** (8px)
- ✅ **Dark overlay** for text readability
- ✅ **Full-screen layout**
- ✅ **Responsive design**
- ✅ **Drop shadows** on text

Just add your image file and it will work perfectly!

## File Structure Should Look Like:

```
ez2invoice/
├── public/
│   └── images/
│       └── truck-shop-bg.jpg  ← Your image goes here
├── src/
│   └── components/
│       └── Hero.tsx  ← Already updated
```
