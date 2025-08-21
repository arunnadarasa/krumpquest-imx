import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Loader2, 
  Upload, 
  Eye,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

interface ArtworkPreviewProps {
  generatedImageUrl: string | null;
  generatedSupabaseUrl: string | null;
  isUploading: boolean;
  selectedStyle: string;
  aspectRatio: string;
  onDownload: () => void;
  onMint: () => void;
}

const aspectRatios = [
  { value: '16:9', label: '16:9 Landscape', width: 768, height: 432 },
  { value: '1:1', label: '1:1 Square', width: 512, height: 512 },
  { value: '9:16', label: '9:16 Portrait', width: 432, height: 768 },
];

export default function ArtworkPreview({
  generatedImageUrl,
  generatedSupabaseUrl,
  isUploading,
  selectedStyle,
  aspectRatio,
  onDownload,
  onMint
}: ArtworkPreviewProps) {
  const selectedAspectRatio = aspectRatios.find(ar => ar.value === aspectRatio);
  const hasGeneratedImage = generatedImageUrl || generatedSupabaseUrl;

  return (
    <Card className="glass h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Eye className="w-5 h-5 text-primary" />
          Artwork Preview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preview Area */}
        <div className="relative">
          {hasGeneratedImage ? (
            <div className="space-y-4">
              <div className="relative group">
                <img 
                  src={generatedSupabaseUrl || generatedImageUrl || ''}
                  alt="Generated artwork"
                  className="w-full h-auto rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{
                    maxHeight: '400px',
                    objectFit: 'contain'
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors duration-300" />
              </div>

              {/* Artwork Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm">
                    {selectedStyle.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  {selectedAspectRatio && (
                    <Badge variant="outline" className="text-sm">
                      {selectedAspectRatio.label}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={onDownload}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Artwork
                  </Button>

                  <Button 
                    onClick={onMint}
                    disabled={isUploading}
                    className="w-full"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Mint as NFT
                      </>
                    )}
                  </Button>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing your kollectible...</span>
                    </div>
                    <div className="bg-muted rounded-md p-3">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>• Uploading to IPFS...</p>
                        <p>• Creating kollectible record...</p>
                        <p>• Minting on Immutable zkEVM...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Placeholder */
            <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center p-8 text-center">
              <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">
                No Artwork Generated
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate your first Krump-inspired artwork using the creation panel. 
                Your generated art will appear here for preview and download.
              </p>
            </div>
          )}
        </div>

        {/* Tips */}
        {!hasGeneratedImage && (
          <div className="bg-accent/10 border border-accent/20 rounded-md p-4">
            <h4 className="font-medium text-accent mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Pro Tips
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Try different art styles for unique looks</li>
              <li>• Experiment with various aspect ratios</li>
              <li>• Add creative prompts for personalization</li>
              <li>• Preview before minting to ensure quality</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}