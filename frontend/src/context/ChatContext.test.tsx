/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ChatProvider, useChat } from './ChatContext';
import { chatService } from '../services/chatService';

vi.mock('../services/chatService', () => ({
    chatService: {
        sendMessage: vi.fn(),
        getProgress: vi.fn().mockResolvedValue(false),
        transformOutfitResponse: vi.fn().mockReturnValue({ status: 'AWAITING_INPUT', hasOutfit: false, message: 'Pick a budget', items: [] }),
    },
}));

let chat: ReturnType<typeof useChat>;
const Page = () => {
    chat = useChat();
    return <div>{chat.messages.map((m) => m.content).join('|')}</div>;
};

describe('ChatProvider', () => {
    it('keeps a reply that arrives while the chat page is closed', async () => {
        let resolveSend: (value: any) => void = () => {};
        (chatService.sendMessage as any).mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));

        const { rerender } = render(<ChatProvider><Page /></ChatProvider>);
        let sending: Promise<void> = Promise.resolve();
        act(() => { sending = chat.sendMessage('Casual'); });

        rerender(<ChatProvider><div>How to use</div></ChatProvider>); // user leaves the chat page
        await act(async () => {
            resolveSend({ status: 'AWAITING_INPUT', conv_id: 'c1', content: { message: 'Pick a budget' } });
            await sending;
        });
        rerender(<ChatProvider><Page /></ChatProvider>); // and comes back

        expect(screen.getByText('Casual|Pick a budget')).toBeTruthy();
    });
});
