import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/krump-quest-hero.jpg';

interface VideoHeroProps {
  children: React.ReactNode;
}

const VideoHero = ({ children }: VideoHeroProps) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getVideoUrl = async () => {
      try {
        const { data } = supabase.storage
          .from('hero')
          .getPublicUrl('hero_video.mp4');
        
        setVideoUrl(data.publicUrl);
      } catch (error) {
        console.error('Error getting video URL:', error);
        setHasError(true);
      }
    };

    getVideoUrl();
  }, []);

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setHasError(true);
      });
    }
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsVideoLoaded(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Video Background */}
      {videoUrl && !hasError && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          poster={heroImage}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Fallback Background Image */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isVideoLoaded && !hasError ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${heroImage})` }}
      />

      {/* Dynamic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="floating absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
        <div className="floating absolute top-40 right-20 w-24 h-24 bg-secondary/20 rounded-full blur-lg" style={{animationDelay: '1s'}}></div>
        <div className="floating absolute bottom-20 left-1/4 w-40 h-40 bg-accent/20 rounded-full blur-2xl" style={{animationDelay: '2s'}}></div>
        <div className="floating absolute top-1/2 right-1/3 w-28 h-28 bg-krump-flashy/20 rounded-full blur-lg" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Video Controls */}
      {isVideoLoaded && !hasError && (
        <div className="absolute top-6 right-6 z-30 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayPause}
            className="glass-strong hover:bg-primary/20 text-foreground"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="glass-strong hover:bg-primary/20 text-foreground"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default VideoHero;