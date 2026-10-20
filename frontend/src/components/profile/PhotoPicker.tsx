import { Camera, ImageIcon } from 'lucide-react';
import { useT } from '../../i18n';

interface PhotoPickerProps {
    onPick: (file: File) => void;
    disabled?: boolean;
    camera?: 'user' | 'environment'; // front camera for selfies, rear for photographing clothes
}

const pickerClass = 'press inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-btn bg-raised border border-line text-[14px] font-semibold hover:border-line-strong transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2';

// "Take photo" opens the camera on phones (the `capture` attribute), a file picker elsewhere
const PhotoPicker = ({ onPick, disabled = false, camera = 'user' }: PhotoPickerProps) => {
    const t = useT();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // picking the same photo again should still trigger a change
        if (file) onPick(file);
    };
    const stateClass = disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer';

    return (
        <div className="flex flex-wrap justify-center gap-2">
            <label className={`${pickerClass} ${stateClass}`}>
                <ImageIcon className="w-4 h-4 text-accent" />
                {t.profile.choosePhoto}
                <input type="file" accept="image/*" className="sr-only" onChange={handleChange} disabled={disabled} />
            </label>
            <label className={`${pickerClass} ${stateClass}`}>
                <Camera className="w-4 h-4 text-accent" />
                {t.profile.takePhoto}
                <input type="file" accept="image/*" capture={camera} className="sr-only" onChange={handleChange} disabled={disabled} />
            </label>
        </div>
    );
};

export default PhotoPicker;
