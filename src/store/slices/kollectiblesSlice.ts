import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Kollectible {
  id: string;
  wallet_address: string;
  prompt: string;
  image_url?: string;
  ipfs_hash?: string;
  pinata_url?: string;
  style: string;
  created_at: string;
  updated_at: string;
}

interface KollectiblesState {
  kollectibles: Kollectible[];
  isGenerating: boolean;
  isUploading: boolean;
  currentWalletAddress: string | null;
  error: string | null;
  generatedImageUrl: string | null;
}

const initialState: KollectiblesState = {
  kollectibles: [],
  isGenerating: false,
  isUploading: false,
  currentWalletAddress: null,
  error: null,
  generatedImageUrl: null,
};

const kollectiblesSlice = createSlice({
  name: 'kollectibles',
  initialState,
  reducers: {
    setWalletAddress: (state, action: PayloadAction<string | null>) => {
      state.currentWalletAddress = action.payload;
    },
    
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
      if (action.payload) {
        state.error = null;
        state.generatedImageUrl = null;
      }
    },
    
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isGenerating = false;
      state.isUploading = false;
    },
    
    setGeneratedImage: (state, action: PayloadAction<string>) => {
      state.generatedImageUrl = action.payload;
      state.isGenerating = false;
    },
    
    setKollectibles: (state, action: PayloadAction<Kollectible[]>) => {
      state.kollectibles = action.payload;
    },
    
    addKollectible: (state, action: PayloadAction<Kollectible>) => {
      state.kollectibles.unshift(action.payload);
      state.generatedImageUrl = null;
      state.isUploading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearGeneratedImage: (state) => {
      state.generatedImageUrl = null;
    }
  }
});

export const {
  setWalletAddress,
  setGenerating,
  setUploading,
  setError,
  setGeneratedImage,
  setKollectibles,
  addKollectible,
  clearError,
  clearGeneratedImage
} = kollectiblesSlice.actions;

export default kollectiblesSlice.reducer;