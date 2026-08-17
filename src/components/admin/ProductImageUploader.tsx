import { useState, useCallback, useRef } from "react";
import { Upload, X, GripVertical, Image as ImageIcon, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductImage {
  id: string;
  url: string;
  file?: File;
  isNew?: boolean;
  isPrimary?: boolean;
}

interface ProductImageUploaderProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ProductImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}: ProductImageUploaderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || disabled) return;
    
    const remainingSlots = maxImages - images.length;
    const newFiles = Array.from(files).slice(0, remainingSlots);
    
    const newImages: ProductImage[] = newFiles.map((file) => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file,
      isNew: true,
      isPrimary: images.length === 0, // First image is primary
    }));

    // If no images existed before, set first new image as primary
    if (images.length === 0 && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    onImagesChange([...images, ...newImages]);
  }, [images, maxImages, onImagesChange, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, disabled]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const removedImage = newImages.splice(index, 1)[0];
    
    // If we removed the primary image, make the first remaining image primary
    if (removedImage.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    
    // Revoke blob URL if it's a new image
    if (removedImage.isNew && removedImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(removedImage.url);
    }
    
    onImagesChange(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newImages = [...images];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, draggedItem);
      onImagesChange(newImages);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length}/{maxImages} images uploaded
        </p>
        {images.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Drag to reorder • Click star to set primary
          </p>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "relative aspect-square rounded-lg border-2 overflow-hidden group cursor-move transition-all",
                draggedIndex === index && "opacity-50 scale-95",
                dragOverIndex === index && "border-primary border-dashed",
                image.isPrimary ? "border-primary ring-2 ring-primary/30" : "border-border",
                disabled && "cursor-default"
              )}
            >
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPrimaryImage(index)}
                  disabled={disabled}
                >
                  <Star className={cn("h-4 w-4", image.isPrimary && "fill-yellow-400 text-yellow-400")} />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeImage(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drag handle */}
              <div className="absolute top-1 left-1 p-1 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-1 right-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  Primary
                </div>
              )}

              {/* Index number */}
              <div className="absolute bottom-1 left-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area & Direct URL Input */}
      {images.length < maxImages && (
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={disabled}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Click or drag to upload</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF up to 50MB each
                </p>
              </div>
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="Or paste image URL (e.g. https://images.unsplash.com/...)"
              className="flex-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  const val = target.value.trim();
                  if (val) {
                    onImagesChange([
                      ...images,
                      {
                        id: `url-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                        url: val,
                        isNew: true,
                        isPrimary: images.length === 0
                      }
                    ]);
                    target.value = "";
                  }
                }
              }}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input?.value?.trim();
                if (val) {
                  onImagesChange([
                    ...images,
                    {
                      id: `url-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                      url: val,
                      isNew: true,
                      isPrimary: images.length === 0
                    }
                  ]);
                  input.value = "";
                }
              }}
              disabled={disabled}
            >
              Add URL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
