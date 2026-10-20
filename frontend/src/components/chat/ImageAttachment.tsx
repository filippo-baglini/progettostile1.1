import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import ImageLightbox from '../ui/ImageLightbox';
import { useT } from '../../i18n';

interface ImageAttachmentProps {
    imageUrl: string;
    altText?: string;
}

const ImageAttachment = ({ imageUrl, altText }: ImageAttachmentProps) => {
    const t = useT();
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const alt = altText ?? t.chat.attachedImage;

    return (
        <>
            <button
                type="button"
                className="relative block overflow-hidden rounded-btn max-w-[280px] bg-card"
                onClick={() => !hasError && setIsLightboxOpen(true)}
                disabled={hasError}
                aria-label={alt}
            >
                {isLoading && <span className="absolute inset-0 animate-pulse bg-raised" />}
                {hasError ? (
                    <span className="w-56 h-40 flex flex-col items-center justify-center gap-2 text-muted p-4">
                        <ImageOff className="w-6 h-6" />
                        <span className="text-[12.5px] text-center">{t.chat.imageFailed}</span>
                    </span>
                ) : (
                    <img
                        src={imageUrl}
                        alt={alt}
                        referrerPolicy="no-referrer"
                        className={`block w-full h-auto max-h-64 object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setHasError(true); }}
                    />
                )}
            </button>

            <ImageLightbox isOpen={isLightboxOpen} imageUrl={imageUrl} altText={alt} onClose={() => setIsLightboxOpen(false)} />
        </>
    );
};

export default ImageAttachment;
