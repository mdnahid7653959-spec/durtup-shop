import { useState, useRef, useCallback } from "react";
import { Upload, X, Video, Play, Loader2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProductVideo {
  type: 'file' | 'youtube';
  url: string;
  file?: File;
  isNew?: boolean;
}

interface ProductVideoUploaderProps {
  video: ProductVideo | null;
  onVideoChange: (video: ProductVideo | null) => void;
  disabled?: boolean;
}

export function ProductVideoUploader({
  video,
  onVideoChange,
  disabled = false,
}: ProductVideoUploaderProps) {
  const [youtubeUrl, setYoutubeUrl] = useState(video?.type === 'youtube' ? video.url : '');
  const [videoTab, setVideoTab] = useState<'upload' | 'youtube'>(video?.type === 'youtube' ? 'youtube' : 'upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    
    const file = files[0];
    if (!file.type.startsWith('video/')) return;

    onVideoChange({
      type: 'file',
      url: URL.createObjectURL(file),
      file,
      isNew: true,
    });
  }, [onVideoChange, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, disabled]);

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl.trim() || disabled) return;
    
    // Extract YouTube video ID and create embed URL
    let videoId = '';
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = youtubeUrl.match(youtubeRegex);
    
    if (match) {
      videoId = match[1];
      onVideoChange({
        type: 'youtube',
        url: youtubeUrl,
      });
    }
  };

  const removeVideo = () => {
    if (video?.type === 'file' && video.url.startsWith('blob:')) {
      URL.revokeObjectURL(video.url);
    }
    onVideoChange(null);
    setYoutubeUrl('');
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      {video && (
        <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video">
          {video.type === 'file' ? (
            <video
              src={video.url}
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={getYoutubeEmbedUrl(video.url) || ''}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}
          
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={removeVideo}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded flex items-center gap-1">
            {video.type === 'youtube' ? (
              <>
                <Youtube className="h-3 w-3" />
                YouTube
              </>
            ) : (
              <>
                <Video className="h-3 w-3" />
                Uploaded
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload/YouTube Tabs */}
      {!video && (
        <Tabs value={videoTab} onValueChange={(v) => setVideoTab(v as 'upload' | 'youtube')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Video
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="h-4 w-4" />
              YouTube Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={disabled}
              />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Click or drag to upload video</p>
                  <p className="text-sm text-muted-foreground">
                    MP4, WebM, MOV up to 50MB
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="youtube" className="mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="youtube-url">YouTube Video URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="youtube-url"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={disabled}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleYoutubeSubmit}
                    disabled={!youtubeUrl.trim() || disabled}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste any YouTube video link
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
