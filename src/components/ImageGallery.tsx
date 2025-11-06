import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImage {
  id?: string;
  image_url: string;
  is_primary?: boolean;
  display_order?: number;
}

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
  fallbackImage?: string;
}

const ImageGallery = ({ images, productName, fallbackImage }: ImageGalleryProps) => {
  // If no images, use fallback
  const displayImages = images.length > 0 ? images : fallbackImage ? [{ image_url: fallbackImage }] : [];
  
  // Early return before hooks to avoid hook order issues
  if (displayImages.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentImage = displayImages[currentImageIndex];
  const hasMultipleImages = displayImages.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') previousImage();
    if (e.key === 'Escape') setIsModalOpen(false);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      previousImage();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Focus modal for keyboard navigation
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isModalOpen]);

  return (
    <>
      {/* Main Image Gallery */}
      <div className="w-full space-y-4">
        {/* Main Image Container */}
        <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <motion.img
            key={currentImageIndex}
            src={currentImage.image_url}
            alt={`${productName} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setIsModalOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            loading="lazy"
          />
          
          {/* Full-screen button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 left-2 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Navigation arrows for multiple images */}
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                onClick={previousImage}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                onClick={nextImage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnails - Only show if multiple images */}
        {hasMultipleImages && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentImageIndex
                    ? 'border-pink-500 ring-2 ring-pink-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={image.image_url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-Screen Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-none w-full h-full p-0 bg-black/95">
          <div 
            ref={modalRef}
            className="relative w-full h-full flex flex-col"
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            tabIndex={0}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-sm">
                {currentImageIndex + 1} of {displayImages.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={currentImage.image_url}
                  alt={`${productName} - Image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
            </div>

            {/* Navigation for multiple images */}
            {hasMultipleImages && (
              <div className="flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={previousImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                
                {/* Dots indicator */}
                <div className="flex gap-2">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageGallery; 