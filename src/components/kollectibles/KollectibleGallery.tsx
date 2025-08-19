import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Grid3X3,
  Grid2X2,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Kollectible } from '@/store/slices/kollectiblesSlice';
import KollectibleModal from './KollectibleModal';

interface KollectibleGalleryProps {
  kollectibles: Kollectible[];
  showHidden: boolean;
  onToggleShowHidden: () => void;
  onHideKollectible: (id: string) => void;
  onShowKollectible: (id: string) => void;
  onDownloadFromIPFS: (kollectible: Kollectible) => void;
}

type ViewMode = 'grid-large' | 'grid-small' | 'list';
type SortBy = 'date' | 'style' | 'prompt';
type SortOrder = 'asc' | 'desc';

export default function KollectibleGallery({
  kollectibles,
  showHidden,
  onToggleShowHidden,
  onHideKollectible,
  onShowKollectible,
  onDownloadFromIPFS
}: KollectibleGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStyle, setFilterStyle] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid-large');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedKollectible, setSelectedKollectible] = useState<Kollectible | null>(null);

  // Filter and sort kollectibles
  const filteredKollectibles = useMemo(() => {
    let filtered = kollectibles.filter(kollectible => {
      const matchesVisibility = showHidden ? true : !kollectible.is_hidden;
      const matchesSearch = !searchQuery || 
        kollectible.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kollectible.style.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStyle = filterStyle === 'all' || kollectible.style === filterStyle;
      
      return matchesVisibility && matchesSearch && matchesStyle;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'style':
          comparison = a.style.localeCompare(b.style);
          break;
        case 'prompt':
          comparison = a.prompt.localeCompare(b.prompt);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [kollectibles, searchQuery, filterStyle, sortBy, sortOrder, showHidden]);

  // Get unique styles for filter dropdown
  const uniqueStyles = useMemo(() => {
    const styles = [...new Set(kollectibles.map(k => k.style))];
    return styles.sort();
  }, [kollectibles]);

  const hiddenCount = kollectibles.filter(k => k.is_hidden).length;

  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid-large':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6';
      case 'grid-small':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
      case 'list':
        return 'space-y-4';
    }
  };

  const renderKollectibleCard = (kollectible: Kollectible) => {
    const isHidden = kollectible.is_hidden;
    
    if (viewMode === 'list') {
      return (
        <Card 
          key={kollectible.id} 
          className={`glass hover-lift cursor-pointer transition-all duration-300 ${
            isHidden ? 'opacity-60' : ''
          }`}
          onClick={() => setSelectedKollectible(kollectible)}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 flex-shrink-0">
                <img 
                  src={kollectible.pinata_url || kollectible.supabase_image_url || kollectible.image_url}
                  alt="Kollectible"
                  className="w-full h-full object-cover rounded-md"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {kollectible.prompt.substring(0, 50)}...
                  </h3>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFromIPFS(kollectible);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        isHidden ? onShowKollectible(kollectible.id) : onHideKollectible(kollectible.id);
                      }}
                    >
                      {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="secondary">{kollectible.style}</Badge>
                  {kollectible.immutable_nft_id && (
                    <Badge variant="outline" className="text-accent">
                      ✨ Minted
                    </Badge>
                  )}
                  {isHidden && (
                    <Badge variant="destructive">Hidden</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(kollectible.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card 
        key={kollectible.id} 
        className={`glass hover-lift cursor-pointer transition-all duration-300 group ${
          isHidden ? 'opacity-60' : ''
        }`}
        onClick={() => setSelectedKollectible(kollectible)}
      >
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            <img 
              src={kollectible.pinata_url || kollectible.supabase_image_url || kollectible.image_url}
              alt="Kollectible"
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                viewMode === 'grid-large' ? 'h-48 lg:h-64' : 'h-32 md:h-40'
              }`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadFromIPFS(kollectible);
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  isHidden ? onShowKollectible(kollectible.id) : onHideKollectible(kollectible.id);
                }}
              >
                {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            {isHidden && (
              <div className="absolute top-2 left-2">
                <Badge variant="destructive" className="text-xs">
                  Hidden
                </Badge>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {kollectible.style}
              </Badge>
              {kollectible.immutable_nft_id && (
                <Badge variant="outline" className="text-accent text-xs">
                  ✨ Minted
                </Badge>
              )}
            </div>
            <p className={`text-sm text-muted-foreground truncate ${
              viewMode === 'grid-large' ? '' : 'text-xs'
            }`}>
              {kollectible.prompt.substring(0, viewMode === 'grid-large' ? 80 : 40)}...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(kollectible.created_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with search and controls */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Your Kollectibles 
            <span className="text-muted-foreground ml-2">
              ({filteredKollectibles.length})
            </span>
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {hiddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShowHidden}
                className="text-xs"
              >
                {showHidden ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showHidden ? 'Hide Hidden' : `Show Hidden (${hiddenCount})`}
              </Button>
            )}
            
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid-large' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setViewMode('grid-large')}
              >
                <Grid2X2 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid-small' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setViewMode('grid-small')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by prompt or style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterStyle} onValueChange={setFilterStyle}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                {uniqueStyles.map(style => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="style">Style</SelectItem>
                <SelectItem value="prompt">Prompt</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-10 h-10 p-0"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {filteredKollectibles.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              {kollectibles.length === 0 
                ? "No kollectibles yet. Create your first artwork!"
                : "No kollectibles match your current filters."
              }
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {kollectibles.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStyle('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {kollectibles.length > 0 && hiddenCount > 0 && !showHidden && (
                <Button variant="secondary" onClick={onToggleShowHidden}>
                  Show Hidden ({hiddenCount})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={getGridClasses()}>
          {filteredKollectibles.map(renderKollectibleCard)}
        </div>
      )}

      {/* Modal */}
      {selectedKollectible && (
        <KollectibleModal
          kollectible={selectedKollectible}
          isOpen={!!selectedKollectible}
          onClose={() => setSelectedKollectible(null)}
          onDownload={() => onDownloadFromIPFS(selectedKollectible)}
          onToggleVisibility={() => {
            const isHidden = selectedKollectible.is_hidden;
            if (isHidden) {
              onShowKollectible(selectedKollectible.id);
            } else {
              onHideKollectible(selectedKollectible.id);
            }
          }}
        />
      )}
    </div>
  );
}