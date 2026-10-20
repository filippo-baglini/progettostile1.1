import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useT } from '../../i18n';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isDeleting }: DeleteAccountModalProps) => {
    const t = useT();
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const word = t.modals.deleteWord;

    const handleClose = () => {
        if (!isDeleting) {
            onClose();
            setDeleteConfirmation('');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} label={t.modals.deleteAccountTitle} className="w-full sm:max-w-md p-6">
            <Trash2 className="w-7 h-7 text-danger mb-4" />
            <h3 className="text-[22px] font-extrabold tracking-[-0.02em] mb-2 pr-8">{t.modals.deleteAccountTitle}</h3>
            <p className="text-[15px] text-muted mb-5">
                {t.modals.deleteAccountBodyA}<span className="font-bold text-danger">{word}</span>{t.modals.deleteAccountBodyB}
            </p>

            <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={t.modals.deleteAccountPlaceholder}
                aria-label={t.modals.deleteAccountPlaceholder}
                className="text-center uppercase tracking-[0.12em] font-semibold focus:!border-danger"
            />

            <div className="flex gap-2.5 mt-5">
                <Button variant="secondary" onClick={handleClose} disabled={isDeleting} className="flex-1">
                    {t.common.cancel}
                </Button>
                <Button
                    variant="danger"
                    onClick={onConfirm}
                    disabled={isDeleting || deleteConfirmation.toUpperCase() !== word}
                    className="flex-1"
                >
                    {isDeleting ? t.common.deleting : t.profile.deleteAccountButton}
                </Button>
            </div>
        </Modal>
    );
};

export default DeleteAccountModal;
