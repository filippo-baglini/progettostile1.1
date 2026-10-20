import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import SearchableMultiSelect from '../ui/SearchableMultiSelect';
import { preferencesService } from '../../services/preferencesService';
import type { AllPreferencesResponse } from '../../services/preferencesService';
import { showToast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';

// Above this many values, a searchable dropdown instead of buttons
const DROPDOWN_THRESHOLD = 10;

// Single-choice preferences (e.g. Genere, the gender)
const SINGLE_SELECT_PREFERENCES = ['Genere', 'gender', 'Gender'];

const PreferencesSection = () => {
  const t = useT();
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
      showToast.error(t.prefs.needGender);
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
        showToast.success(t.prefs.saved);
      } else {
        showToast.error(t.prefs.saveFailed);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast.error(t.prefs.saveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPrefs) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  // Preferences in id order
  const sortedPreferences = Object.entries(allPreferences).sort(([idA], [idB]) => Number(idA) - Number(idB));
  const displayName = (name: string) => t.prefs.names[name] ?? name;

  return (
    <div>
      {sortedPreferences.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[15px] text-muted">{t.prefs.loadFailed}</p>
          <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
            {t.common.retry}
          </Button>
        </div>
      )}

      {sortedPreferences.map(([prefId, pref]) => {
        const selectedValues = preferencesService.parseMultiValue(preferences[pref.name]);
        const isSingleSelect = SINGLE_SELECT_PREFERENCES.includes(pref.name);
        const label = displayName(pref.name);

        return (
          <div key={prefId} className="pb-6 mb-6 border-b border-line last-of-type:border-0">
            <h3 className="text-[15px] font-bold mb-3 first-letter:uppercase">{label}</h3>

            {pref.values && pref.values.length > 0 ? (
              pref.values.length > DROPDOWN_THRESHOLD ? (
                <SearchableMultiSelect
                  values={pref.values}
                  selectedValues={selectedValues}
                  onToggle={(value: string) => handleToggleValue(pref.name, value)}
                  placeholder={t.prefs.select(label)}
                />
              ) : (
                <div className="flex flex-wrap gap-2" role={isSingleSelect ? 'radiogroup' : 'group'} aria-label={label}>
                  {pref.values.map((value) => {
                    const isSelected = isSingleSelect ? preferences[pref.name] === value : selectedValues.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => (isSingleSelect ? handleSingleSelect(pref.name, value) : handleToggleValue(pref.name, value))}
                        aria-pressed={isSelected}
                        className="ps-chip"
                      >
                        <span className="first-letter:uppercase">{value}</span>
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
                placeholder={t.prefs.enter(label)}
                aria-label={label}
                className="ps-field"
              />
            )}
          </div>
        );
      })}

      {sortedPreferences.length > 0 && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13.5px] text-muted tabular">{selectedCount > 0 ? t.prefs.selected(selectedCount) : ''}</p>
          <Button className="w-full sm:w-auto" onClick={handleSave} isLoading={isLoading}>
            {t.prefs.save}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PreferencesSection;
