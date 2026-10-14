import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import SearchableMultiSelect from '../ui/SearchableMultiSelect';
import { preferencesService } from '../../services/preferencesService';
import type { AllPreferencesResponse } from '../../services/preferencesService';
import { showToast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { triggerSuccessConfetti } from '../../utils/confetti';

// Above this many values, a searchable dropdown instead of buttons
const DROPDOWN_THRESHOLD = 10;

// Single-choice preferences (e.g. Genere, the gender)
const SINGLE_SELECT_PREFERENCES = ['Genere', 'gender', 'Gender'];

const PreferencesSection = () => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  // The user's preferences: { "Brand": "h&m,zara", "gender": "male" }
  const [preferences, setPreferences] = useState<Record<string, string>>({});

  // All available preferences with their possible values
  const [allPreferences, setAllPreferences] = useState<AllPreferencesResponse>({});

  // Number of selected values across all preferences
  const selectedCount = Object.values(preferences)
    .flatMap(v => preferencesService.parseMultiValue(v))
    .length;

  // Load existing preferences and available options on mount
  useEffect(() => {
    const loadPreferencesAndOptions = async () => {
      try {
        setIsLoadingPrefs(true);
        const [existingPrefs, allPrefs] = await Promise.all([
          preferencesService.getPreferences(),
          preferencesService.getAllPreferences()
        ]);
        if (existingPrefs) {
          // Mappa "gender" → "Genere" per allinearlo con allPreferences
          const mappedPrefs = { ...existingPrefs };
          if (mappedPrefs['gender'] && !mappedPrefs['Genere']) {
            mappedPrefs['Genere'] = mappedPrefs['gender'];
            delete mappedPrefs['gender'];
          }
          setPreferences(mappedPrefs);
        }
        setAllPreferences(allPrefs);
      } catch (error) {
        console.error('Failed to load preferences/options:', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };
    loadPreferencesAndOptions();
  }, []);

  // Toggle one value of a multi-choice preference
  const handleToggleValue = (prefName: string, value: string) => {
    setPreferences((prev) => {
      const currentValues = preferencesService.parseMultiValue(prev[prefName]);
      const isSelected = currentValues.includes(value);

      let newValues: string[];
      if (isSelected) {
        // Rimuovi il valore
        newValues = currentValues.filter(v => v !== value);
      } else {
        // Aggiungi il valore
        newValues = [...currentValues, value];
      }

      return { ...prev, [prefName]: preferencesService.joinMultiValue(newValues) };
    });
  };

  // Single choice (e.g. Genere)
  const handleSingleSelect = (prefName: string, value: string) => {
    setPreferences((prev) => {
      // Selecting it again clears it
      if (prev[prefName] === value) {
        return { ...prev, [prefName]: '' };
      }
      // Altrimenti seleziona (sovrascrive il precedente)
      return { ...prev, [prefName]: value };
    });
  };

  // Free-text preferences
  const handleTextChange = (prefName: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [prefName]: value }));
  };

  const handleSave = async () => {
    // The AI needs it to pick men's or women's clothes
    if (!(preferences['Genere'] || preferences['gender'])) {
      showToast.error('Choose a gender before saving');
      return;
    }
    setIsLoading(true);
    try {
      // Send EVERY available preference: the backend replaces them all, so an unselected one goes as "" to clear it
      const completePreferences: Record<string, string> = {};

      // First the values already set
      Object.entries(preferences).forEach(([key, value]) => {
        // Genere is skipped: it is sent as "gender" below
        if (key !== 'Genere') {
          completePreferences[key] = value;
        }
      });

      // Then every other available preference, empty if not set
      Object.values(allPreferences).forEach((pref) => {
        // "Genere" becomes "gender" below
        if (pref.name === 'Genere') return;

        // Not added yet: its current value, or empty
        if (!(pref.name in completePreferences)) {
          completePreferences[pref.name] = preferences[pref.name] || '';
        }
      });

      // The backend always expects "gender" (not "Genere")
      const genderValue = preferences['Genere'] || preferences['gender'] || '';
      completePreferences['gender'] = genderValue;


      const success = await preferencesService.updatePreferences(completePreferences);
      if (success) {
        if (user) updateUser({ ...user, preferences: completePreferences });
        triggerSuccessConfetti();
        showToast.success('Preferences saved!');
      } else {
        showToast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while fetching existing preferences
  if (isLoadingPrefs) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // Preferences in id order
  const sortedPreferences = Object.entries(allPreferences).sort(([idA], [idB]) => Number(idA) - Number(idB));

  return (
    <div>
      {!isLoadingPrefs && sortedPreferences.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-stone-400">
            Unable to load preferences options. Please try again later.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Preferences Summary Card */}
      {selectedCount > 0 && (
        <div className="mb-6 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary dark:text-primary-light" />
            <p className="text-sm font-medium text-primary dark:text-primary-light">
              {selectedCount} preference{selectedCount !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
      )}

      {/* Render each preference section */}
      {sortedPreferences.map(([prefId, pref]) => {
        const selectedValues = preferencesService.parseMultiValue(preferences[pref.name]);
        const isSingleSelect = SINGLE_SELECT_PREFERENCES.includes(pref.name);

        return (
          <div key={prefId} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-stone-200 mb-4 capitalize">
              {pref.name}
            </h3>

            {pref.values && pref.values.length > 0 ? (
              // Many values: a searchable dropdown; otherwise buttons
              pref.values.length > DROPDOWN_THRESHOLD ? (
                <SearchableMultiSelect
                  values={pref.values}
                  selectedValues={selectedValues}
                  onToggle={(value: string) => handleToggleValue(pref.name, value)}
                  placeholder={`Select ${pref.name.toLowerCase()}...`}
                />
              ) : isSingleSelect ? (
                // Selezione singola (es. Genere)
                <div className="flex flex-wrap gap-2">
                  {pref.values.map((value) => {
                    const isSelected = preferences[pref.name] === value;
                    return (
                      <button
                        key={value}
                        onClick={() => handleSingleSelect(pref.name, value)}
                        className={`px-4 py-2 min-h-[44px] rounded-full text-sm md:text-base font-medium transition-all duration-200 border-2 ${isSelected
                          ? 'bg-primary/10 border-primary text-primary dark:text-primary-light'
                          : 'bg-cream-100 dark:bg-surface-darker border-cream-300 dark:border-surface-muted text-gray-600 dark:text-stone-400 hover:border-primary/50 hover:bg-cream-200 dark:hover:bg-surface-muted'
                          }`}
                      >
                        <span className="capitalize">{value}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Selezione multipla (es. Brand)
                <div className="flex flex-wrap gap-2">
                  {pref.values.map((value) => {
                    const isSelected = selectedValues.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => handleToggleValue(pref.name, value)}
                        className={`px-4 py-2 min-h-[44px] rounded-full text-sm md:text-base font-medium transition-all duration-200 border-2 ${isSelected
                          ? 'bg-primary/10 border-primary text-primary dark:text-primary-light'
                          : 'bg-cream-100 dark:bg-surface-darker border-cream-300 dark:border-surface-muted text-gray-600 dark:text-stone-400 hover:border-primary/50 hover:bg-cream-200 dark:hover:bg-surface-muted'
                          }`}
                      >
                        <span className="capitalize">{value}</span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // No predefined values (e.g. colour): a text input
              <input
                type="text"
                value={preferences[pref.name] || ''}
                onChange={(e) => handleTextChange(pref.name, e.target.value)}
                placeholder={`Enter your preferred ${pref.name.toLowerCase()}`}
                className="border border-cream-400 dark:border-surface-border rounded-xl px-4 py-3 w-full bg-cream-100 dark:bg-surface-muted text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 outline-none"
              />
            )}
          </div>
        );
      })}

      {sortedPreferences.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            className="w-full md:w-auto min-w-[140px]"
            onClick={handleSave}
            isLoading={isLoading}
          >
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
};

export default PreferencesSection;
