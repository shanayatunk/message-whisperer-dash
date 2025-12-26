import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageOff } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SecureImageProps {
  mediaId: string;
  alt: string;
  className?: string;
}

// Simple in-memory cache for blob URLs (shared across instances)
const blobCache = new Map<string, string>();

export function SecureImage({ mediaId, alt, className }: SecureImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      // GUARDRAIL 2: Check cache first
      const cached = blobCache.get(mediaId);
      if (cached) {
        if (isMounted) {
          setObjectUrl(cached);
          urlRef.current = cached;
          setIsLoading(false);
        }
        return;
      }

      try {
        const token = sessionStorage.getItem("auth_token");
        const response = await fetch(`${API_BASE}/api/v1/conversations/media/${mediaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Cache the URL
        blobCache.set(mediaId, url);

        if (isMounted) {
          setObjectUrl(url);
          urlRef.current = url;
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[SecureImage] Error fetching media:", error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    setHasError(false);
    fetchImage();

    // GUARDRAIL 1: Cleanup on unmount or mediaId change
    return () => {
      isMounted = false;
      // Note: We don't revoke cached URLs immediately to allow reuse
      // URLs are only cleaned up when the page unloads or cache is cleared
    };
  }, [mediaId]);

  // Cleanup blob URLs on page unload
  useEffect(() => {
    const handleUnload = () => {
      blobCache.forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      blobCache.clear();
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  if (isLoading) {
    return <Skeleton className={cn("w-[200px] h-[150px] rounded-md", className)} />;
  }

  if (hasError || !objectUrl) {
    return (
      <div className={cn(
        "w-[200px] h-[100px] rounded-md bg-muted flex items-center justify-center",
        className
      )}>
        <ImageOff className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
    );
  }

  // GUARDRAIL 3: Click to zoom only (no download, no open in new tab)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={objectUrl}
          alt={alt}
          className={cn(
            "max-w-[250px] rounded-md cursor-zoom-in hover:opacity-90 transition-opacity",
            className
          )}
        />
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur">
        <img
          src={objectUrl}
          alt={alt}
          className="w-full h-full object-contain max-h-[85vh]"
        />
      </DialogContent>
    </Dialog>
  );
}
