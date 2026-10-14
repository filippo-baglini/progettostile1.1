import api from './api';

// Preferences as /preferences/all sends them: { "<id>": { name, values } }
export interface PreferenceOption {
  name: string;
  values: string[];
}

export type AllPreferencesResponse = Record<string, PreferenceOption>;

export const preferencesService = {
  // Get user preferences (e.g. { "Brand": "h&m,zara", "gender": "male" })
  getPreferences: async (): Promise<Record<string, string> | null> => {
    try {
      const response = await api.get<{ success: boolean; user: { preferences: Record<string, string> } }>('/user/session');
      return response.data.user.preferences || {};
    } catch (error) {
      console.error('Error loading preferences:', error);
      return null;
    }
  },

  // Update user preferences (e.g. { "Brand": "h&m,zara", "gender": "male" })
  updatePreferences: async (preferences: Record<string, string>): Promise<boolean> => {
    const response = await api.put<{ success: boolean }>('/preferences', preferences);
    return response.data.success;
  },

  // Get all available preferences with their possible values
  getAllPreferences: async (): Promise<AllPreferencesResponse> => {
    try {
      const response = await api.get<AllPreferencesResponse>('/preferences/all');
      const prefsData = response.data;

      // "Genere" (gender, id 4) is always there
      const hasGenere = Object.values(prefsData).some(p => p.name === 'Genere' || p.name === 'gender');
      if (!hasGenere) {
        prefsData[4] = {
          name: 'Genere',
          values: ['male', 'female', 'non-binary']
        };
      }

      return prefsData;
    } catch (error) {
      console.error('Error loading all preferences:', error);
      return {};
    }
  },

  // Helper: converte stringa separata da virgola in array
  parseMultiValue: (value: string | undefined): string[] => {
    if (!value || value.trim() === '') return [];
    return value.split(',').map(v => v.trim()).filter(v => v !== '');
  },

  // Helper: converte array in stringa separata da virgola
  joinMultiValue: (values: string[]): string => {
    return values.join(',');
  },
};
