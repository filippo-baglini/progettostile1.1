import { Camera, ImageIcon } from 'lucide-react';

interface PhotoPickerProps {
    onPick: (file: File) => void;
    disabled?: boolean;
    camera?: 'user' | 'environment'; // front camera for selfies, rear for photographing clothes
}

const pickerClass = 'inline-flex items-center px-4 py-2 rounded-xl border border-cream-400 dark:border-surface-border text-sm font-medium text-text-dark dark:text-stone-200 hover:bg-cream-200 dark:hover:bg-surface-muted transition-colors focus-within:ring-2 focus-within:ring-primary/40';

// "Take photo" opens the camera on phones (the `capture` attribute), a file picker elsewhere
const PhotoPicker = ({ onPick, disabled = false, camera = 'user' }: PhotoPickerProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // picking the same photo again should still trigger a change
        if (file) onPick(file);
    };
    const stateClass = disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer';

    return (
        <div className="flex flex-wrap justify-center gap-2">
            <label className={`${pickerClass} ${stateClass}`}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Choose photo
                <input type="file" accept="image/*" className="sr-only" onChange={handleChange} disabled={disabled} />
            </label>
            <label className={`${pickerClass} ${stateClass}`}>
                <Camera className="w-4 h-4 mr-2" />
                Take photo
                <input type="file" accept="image/*" capture={camera} className="sr-only" onChange={handleChange} disabled={disabled} />
            </label>
        </div>
    );
};

export default PhotoPicker;
