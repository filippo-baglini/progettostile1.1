import { MessageSquareX } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useT } from '../../i18n';

interface DeleteAllChatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}

const DeleteAllChatsModal = ({ isOpen, onClose, onConfirm, isDeleting }: DeleteAllChatsModalProps) => {
    const t = useT();
    const handleClose = () => {
        if (!isDeleting) onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} label={t.modals.deleteChatsTitle} className="w-full sm:max-w-md p-6">
            <MessageSquareX className="w-7 h-7 text-danger mb-4" />
            <h3 className="text-[22px] font-extrabold tracking-[-0.02em] mb-2 pr-8">{t.modals.deleteChatsTitle}</h3>
            <p className="text-[15px] text-muted mb-6">{t.modals.deleteChatsBody}</p>

            <div className="flex gap-2.5">
                <Button variant="secondary" onClick={handleClose} disabled={isDeleting} className="flex-1">
                    {t.common.cancel}
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isDeleting} className="flex-1">
                    {isDeleting ? t.common.deleting : t.profile.deleteChatsButton}
                </Button>
            </div>
        </Modal>
    );
};

export default DeleteAllChatsModal;
