// User types
export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

// A photo of one of the user's own clothes; `section` is a key of WARDROBE_SECTIONS
export interface WardrobeItem {
  id: number;
  section: string;
  imageUrl: string;
  name?: string;
  color?: string;
  brand?: string;
}

export interface WardrobeDetails {
  name?: string;
  color?: string;
  brand?: string;
}

// As /user/session returns them: preference name -> comma-separated values, plus `gender`
export type UserPreferences = Record<string, string>;

// Chat types
// Outfit Generation Option for the poll
export interface OutfitGenerationOption {
  id: string;
  label: string;
  description: string;
  value: string; // The value to send back to the backend
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  outfit?: Outfit;
  imageUrl?: string; // Optional image attached to the message
  isError?: boolean; // True if this is an error message
  errorDetails?: {
    originalMessage: string;
    originalImage?: File;
    originalWardrobe?: PickedPiece[];
    errorTitle?: string;
    errorMessage?: string;
  };
  outfits?: Outfit[]; // Support for multiple outfit options
  budgetOptions?: BudgetOption[]; // Interactive budget poll options
  outfitGenerationOptions?: OutfitGenerationOption[]; // Interactive outfit generation options poll
  wardrobeItems?: PickedPiece[]; // Wardrobe pieces the user picked for this message
  wardrobeSuggestion?: WardrobeSuggestion; // "Add to your wardrobe?" for a piece the user owns in their photo
}

// The AI's guess at a piece the user owns, in the photo the reply answered
export interface WardrobeSuggestion extends WardrobeDetails {
  section: string;
  imageUrl: string;
}

// A wardrobe piece attached to a chat message
export interface PickedPiece {
  id: number;
  imageUrl: string;
}

export interface BudgetOption {
  label: string;
  min_budget: number;
  max_budget: number;
  description: string;
}

export interface ChatHistory {
  id: string;
  title: string;
  lastMessage: Date;
}

// Outfit types
export interface Outfit {
  id: string;
  items: OutfitItem[];
  totalPrice: number;
  remainingBudget?: number;
  explanation?: string;
}

export interface OutfitItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category: 'jacket' | 'blazer' | 'shirt' | 'pants' | 'shoes' | 'accessories';
  brand?: string;
  link?: string;
  available?: boolean;
  description?: string;
  owned?: boolean; // One of the user's own wardrobe pieces: no price, no shop link
}

// Filter types
export interface OutfitFilters {
  budgetMax?: number;
  outfitType: 'full' | 'partial';
  selectedItems: ('jacket' | 'blazer' | 'shirt' | 'pants' | 'shoes')[];
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
