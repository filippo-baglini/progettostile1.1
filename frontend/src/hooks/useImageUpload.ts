import { useState, useRef, useCallback } from 'react';
import { showToast } from '../utils/toast';
import { t } from '../i18n';

export const useImageUpload = (fileReaderFactory = () => new FileReader()) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const validateAndSetImage = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast.error(t().status.imageType);
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error(t().status.imageSize);
      return false;
    }

    setSelectedImage(file);

    // Create preview
    const reader = fileReaderFactory();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      showToast.success(t().status.imageAttached);
    };
    reader.readAsDataURL(file);

    return true;
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetImage(file);
    }
    // Reset the input value so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetImage(files[0]);
    }
  };

  // Stable: ChatPage's navigation effect depends on it
  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  return {
    selectedImage,
    imagePreview,
    isDragging,
    handleImageSelect,
    handleRemoveImage,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearImage,
  };
};
