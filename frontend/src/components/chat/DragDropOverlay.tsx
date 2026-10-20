import { ImagePlus } from 'lucide-react';
import { useT } from '../../i18n';

const DragDropOverlay = () => {
  const t = useT();
  return (
    <div className="absolute inset-0 z-40 bg-ground/80 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none">
      <div className="w-full max-w-sm rounded-card border-2 border-dashed border-accent/70 bg-card px-6 py-10 text-center">
        <ImagePlus className="w-10 h-10 text-accent mx-auto mb-4" />
        <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">{t.chat.dropTitle}</h3>
        <p className="text-[14px] text-muted mt-1">{t.chat.dropBody}</p>
      </div>
    </div>
  );
};

export default DragDropOverlay;
