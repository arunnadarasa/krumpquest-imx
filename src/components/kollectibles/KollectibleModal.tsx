import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Calendar, 
  Palette, 
  Hash,
  X
} from 'lucide-react';
import { Kollectible } from '@/store/slices/kollectiblesSlice';

interface KollectibleModalProps {
  kollectible: Kollectible;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onToggleVisibility: () => void;
}

export default function KollectibleModal({
  kollectible,
  isOpen,
  onClose,
  onDownload,
  onToggleVisibility
}: KollectibleModalProps) {
  const isHidden = kollectible.is_hidden;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Image Section */}
          <div className="flex-1 relative bg-muted">
            <img 
              src={kollectible.pinata_url || kollectible.supabase_image_url || kollectible.image_url}
              alt="Kollectible"
              className="w-full h-64 lg:h-full object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 w-8 h-8 p-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Details Section */}
          <div className="lg:w-96 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>Kollectible Details</span>
                <div className="flex gap-2">
                  {kollectible.story_ip_id && (
                    <Badge variant="outline" className="text-accent">
                      ✨ Minted
                    </Badge>
                  )}
                  {isHidden && (
                    <Badge variant="destructive">
                      Hidden
                    </Badge>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Prompt */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Prompt
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {kollectible.prompt}
                </p>
              </div>

              <Separator />

              {/* Metadata */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Style:</span>
                  <Badge variant="secondary">{kollectible.style}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(kollectible.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Story Protocol Info */}
              {kollectible.story_ip_id && (
                <>
                  <Separator />
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-semibold text-accent flex items-center gap-2">
                        ✨ Story Protocol
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">IP Asset ID:</span>
                          <p className="font-mono text-xs text-muted-foreground break-all">
                            {kollectible.story_ip_id}
                          </p>
                        </div>
                        
                        {kollectible.story_tx_hash && (
                          <div>
                            <span className="font-medium">Transaction:</span>
                            <p className="font-mono text-xs text-muted-foreground break-all">
                              {kollectible.story_tx_hash}
                            </p>
                          </div>
                        )}
                        
                        {kollectible.story_license_terms_ids && (
                          <div>
                            <span className="font-medium">License:</span>
                            <div className="flex gap-1 mt-1">
                              {kollectible.story_license_terms_ids.map((license, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {license}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          const explorerUrl = `https://aeneid.explorer.story.foundation/ipa/${kollectible.story_ip_id}`;
                          window.open(explorerUrl, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Story Explorer
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* IPFS Info */}
              {kollectible.ipfs_hash && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">IPFS Storage</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">Hash:</span>
                        <p className="font-mono text-xs text-muted-foreground break-all">
                          {kollectible.ipfs_hash}
                        </p>
                      </div>
                      {kollectible.pinata_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(kollectible.pinata_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on IPFS
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              <Button 
                onClick={onDownload}
                className="w-full"
                variant="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Artwork
              </Button>
              
              <Button 
                onClick={onToggleVisibility}
                variant="outline"
                className="w-full"
              >
                {isHidden ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Kollectible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Kollectible
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}