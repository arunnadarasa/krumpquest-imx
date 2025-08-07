import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, 
  Wand2, 
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArtworkGenerationPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  selectedStyle: string;
  setSelectedStyle: (style: string) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  characterGender: string;
  setCharacterGender: (gender: string) => void;
  subjectType: string;
  setSubjectType: (type: string) => void;
  animalSpecies: string;
  setAnimalSpecies: (species: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

const aspectRatios = [
  { value: '16:9', label: '16:9 Landscape', width: 768, height: 432 },
  { value: '1:1', label: '1:1 Square', width: 512, height: 512 },
  { value: '9:16', label: '9:16 Portrait', width: 432, height: 768 },
];

const characterGenders = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Gender Neutral' },
];

const subjectTypes = [
  { value: 'human', label: 'Human' },
  { value: 'animal', label: 'Animal' },
];

const artStyles = [
  { value: 'comic_book', label: '📚 Comic Book (Default)', isDefault: true },
  { value: 'urban_sketch', label: '🏙️ Urban Sketch' },
  { value: 'street_art', label: '🎨 Street Art' },
  { value: 'noir', label: '🎭 Film Noir' },
  { value: 'graphic_novel', label: '📖 Graphic Novel' },
  { value: 'minimalist', label: '⚪ Minimalist' },
];

const BASE_KRUMP_PROMPT = "A dynamic Krump dancer in mid-performance, wearing a snapback cap, oversized baseball jacket, black jeans, and Timberland boots. Black and white comic book art style, high contrast ink illustrations, bold linework, dramatic shadows. Urban street dance pose with expressive body language, capturing the intensity and energy of Krump dancing. Comic book panel aesthetic with strong black outlines and crosshatching details.";

export default function ArtworkGenerationPanel({
  prompt,
  setPrompt,
  selectedStyle,
  setSelectedStyle,
  aspectRatio,
  setAspectRatio,
  characterGender,
  setCharacterGender,
  subjectType,
  setSubjectType,
  animalSpecies,
  setAnimalSpecies,
  isGenerating,
  onGenerate
}: ArtworkGenerationPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBasePrompt, setShowBasePrompt] = useState(false);

  const selectedAspectRatio = aspectRatios.find(ar => ar.value === aspectRatio);

  return (
    <Card className="glass h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Wand2 className="w-5 h-5 text-primary" />
          Create New Artwork
        </CardTitle>
        <CardDescription>
          Customize your Krump-inspired digital art kollectible
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Base Prompt Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Base Prompt</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowBasePrompt(!showBasePrompt)}
                    className="h-6 p-1"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View the fixed base prompt that applies to all artworks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Collapsible open={showBasePrompt} onOpenChange={setShowBasePrompt}>
            <CollapsibleContent>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {BASE_KRUMP_PROMPT}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <Badge variant="outline" className="text-xs">
            🔒 This base prompt is automatically applied to ensure Krump authenticity
          </Badge>
        </div>

        <Separator />

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-sm font-medium">
            Additional Prompt (Optional)
          </Label>
          <Textarea
            id="prompt"
            placeholder="Add your creative touches... (e.g., 'with neon lighting', 'in a cyberpunk setting', 'with graffiti background')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-20 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This will be combined with the base Krump prompt above
          </p>
        </div>

        {/* Art Style */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Art Style</Label>
          <Select value={selectedStyle} onValueChange={setSelectedStyle}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {artStyles.map(style => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex items-center gap-2">
                    {style.label}
                    {style.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map(ratio => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label} ({ratio.width}×{ratio.height})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAspectRatio && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div 
                className="border border-muted-foreground"
                style={{
                  width: Math.max(selectedAspectRatio.width / 20, 16),
                  height: Math.max(selectedAspectRatio.height / 20, 16),
                }}
              />
              Preview ratio: {selectedAspectRatio.width}×{selectedAspectRatio.height}px
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm font-medium">Advanced Settings</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            <Separator />
            
            {/* Subject Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject Type</Label>
              <Select value={subjectType} onValueChange={setSubjectType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjectTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Character Gender */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Character Gender</Label>
              <Select value={characterGender} onValueChange={setCharacterGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {characterGenders.map(gender => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Animal Species (if animal selected) */}
            {subjectType === 'animal' && (
              <div className="space-y-2">
                <Label htmlFor="animalSpecies" className="text-sm font-medium">
                  Animal Species
                </Label>
                <Input
                  id="animalSpecies"
                  placeholder="e.g., lion, eagle, wolf..."
                  value={animalSpecies}
                  onChange={(e) => setAnimalSpecies(e.target.value)}
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Generate Button */}
        <Button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Artwork
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground animate-pulse">
              Creating your unique Krump artwork...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}