/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from './useChatMessages';
import { chatService } from '../services/chatService';
import { showToast } from '../utils/toast';

// Mock dependencies
vi.mock('../services/chatService', () => ({
    chatService: {
        getChatConversation: vi.fn(),
        sendMessage: vi.fn(),
        transformOutfitResponse: vi.fn(),
    },
}));

vi.mock('../utils/toast', () => ({
    showToast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

describe('useChatMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useChatMessages());

        expect(result.current.messages).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentChatId).toBeUndefined();
    });

    it('loadChatMessages fetches messages and updates state', async () => {
        const mockMessages = [
            { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
            { id: '2', role: 'assistant', content: 'Hi', timestamp: new Date() },
        ];
        (chatService.getChatConversation as any).mockResolvedValue(mockMessages);

        const { result } = renderHook(() => useChatMessages());

        await act(async () => {
            await result.current.loadChatMessages('chat-123');
        });

        expect(chatService.getChatConversation).toHaveBeenCalledWith('chat-123');
        expect(result.current.messages).toEqual(mockMessages);
        expect(result.current.currentChatId).toBe('chat-123');
    });

    it('sendMessage adds optimistic user message and calls API', async () => {
        const mockResponse = {
            status: 'COMPLETED',
            conv_id: 'new-chat-id',
            conv_title: 'New Chat',
            content: { message: 'Response', outfit: [], explanation: '' }
        };
        (chatService.sendMessage as any).mockResolvedValue(mockResponse);
        (chatService.transformOutfitResponse as any).mockReturnValue({
            status: 'COMPLETED',
            hasOutfit: false,
            message: 'Response',
            items: [],
            totalPrice: 0,
            explanation: ''
        });

        const { result } = renderHook(() => useChatMessages());

        await act(async () => {
            await result.current.sendMessage('Hello AI');
        });

        // Verify optimistic update (user message added)
        expect(result.current.messages.some(m => m.content === 'Hello AI' && m.role === 'user')).toBe(true);

        // Verify API call - matches the full signature: 
        // message, filters, chatId, imageFile, outfitIndex, messageId, guestGender
        expect(chatService.sendMessage).toHaveBeenCalledWith(
            'Hello AI',
            { outfitType: 'full', selectedItems: [] },
            undefined, // chatId
            undefined, // imageFile
            null,      // outfitIndex
            null,      // messageId
            undefined  // guestGender
        );

        // Verify state updates after response
        expect(result.current.currentChatId).toBe('new-chat-id');
        expect(result.current.currentChatTitle).toBe('New Chat');

        // Verify assistant message added
        expect(result.current.messages.some(m => m.content === 'Response' && m.role === 'assistant')).toBe(true);
    });

    it('sendMessage handles error and reverts optimistic update', async () => {
        (chatService.sendMessage as any).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useChatMessages());

        await act(async () => {
            await result.current.sendMessage('Fail me');
        });

        // Should NOT show toast for this error (handled in-chat)
        expect(showToast.error).not.toHaveBeenCalled();

        // Message should NOT be removed, but an error message added
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Fail me');
        expect(result.current.messages[1].isError).toBe(true);
    });
    it('uses cached messages if available', async () => {
        const { result } = renderHook(() => useChatMessages());
        const mockMessages = [{ id: '1', role: 'user', content: 'Hello' }];
        (chatService.getChatConversation as any).mockResolvedValue(mockMessages);

        // First load
        await act(async () => {
            await result.current.loadChatMessages('1');
        });

        expect(chatService.getChatConversation).toHaveBeenCalledTimes(1);
        expect(result.current.messages).toEqual(mockMessages);

        // Clear messages to simulate switching away
        act(() => {
            result.current.clearMessages();
        });

        // Second load - should use cache
        await act(async () => {
            await result.current.loadChatMessages('1');
        });

        expect(chatService.getChatConversation).toHaveBeenCalledTimes(1); // Still 1 call
        expect(result.current.messages).toEqual(mockMessages);
    });

    it('updates cache when sending message', async () => {
        const { result } = renderHook(() => useChatMessages());
        const mockResponse = {
            status: 'COMPLETED',
            content: { message: 'Response', outfit: [], explanation: '' },
            conv_id: '1'
        };
        (chatService.sendMessage as any).mockResolvedValue(mockResponse);
        (chatService.transformOutfitResponse as any).mockReturnValue({
            status: 'COMPLETED',
            hasOutfit: false,
            message: 'Response',
            items: []
        });
        (chatService.getChatConversation as any).mockResolvedValue([]);

        // Initialize with a chat ID
        await act(async () => {
            await result.current.loadChatMessages('1');
        });

        // Send message
        await act(async () => {
            await result.current.sendMessage('Hello');
        });

        // Clear and reload to check cache
        act(() => {
            result.current.clearMessages();
        });

        await act(async () => {
            await result.current.loadChatMessages('1');
        });

        // Should have user message and assistant message in cache
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello');
        expect(result.current.messages[1].content).toBe('Response');
    });

    it('does not add a reply to a chat the user switched to while waiting', async () => {
        let resolveSend: (value: any) => void = () => {};
        (chatService.sendMessage as any).mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
        (chatService.transformOutfitResponse as any).mockReturnValue({
            status: 'COMPLETED', hasOutfit: false, message: 'Reply for chat A', items: [], totalPrice: 0, explanation: ''
        });
        (chatService.getChatConversation as any).mockResolvedValue([
            { id: 'b1', role: 'user', content: 'Chat B message', timestamp: new Date() },
        ]);

        const { result } = renderHook(() => useChatMessages());

        let sending: Promise<void> = Promise.resolve();
        act(() => {
            sending = result.current.sendMessage('Question in chat A');
        });
        await act(async () => {
            await result.current.loadChatMessages('chat-B');
        });
        await act(async () => {
            resolveSend({ status: 'COMPLETED', conv_id: 'chat-A', content: { message: 'Reply for chat A' } });
            await sending;
        });

        expect(result.current.currentChatId).toBe('chat-B');
        expect(result.current.messages.map((m) => m.content)).toEqual(['Chat B message']);
    });

    it('stops showing the loading skeleton when a loading chat is closed', async () => {
        let resolveLoad: (value: any) => void = () => {};
        (chatService.getChatConversation as any).mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));

        const { result } = renderHook(() => useChatMessages());

        let loading: Promise<void> = Promise.resolve();
        act(() => {
            loading = result.current.loadChatMessages('chat-deleted');
        });
        act(() => {
            result.current.clearMessages();
        });
        await act(async () => {
            resolveLoad([]);
            await loading;
        });

        expect(result.current.isFetching).toBe(false);
    });

    it('retry removes the failed user message, not the latest one', async () => {
        (chatService.sendMessage as any).mockRejectedValueOnce(new Error('Network error'));
        (chatService.sendMessage as any).mockResolvedValueOnce({ status: 'COMPLETED', content: { message: 'Second reply' } });
        (chatService.transformOutfitResponse as any).mockReturnValue({
            status: 'COMPLETED', hasOutfit: false, message: 'Second reply', items: [], totalPrice: 0, explanation: ''
        });

        const { result } = renderHook(() => useChatMessages());
        await act(async () => { await result.current.sendMessage('First (fails)'); });
        await act(async () => { await result.current.sendMessage('Second (works)'); });
        const errorId = result.current.messages.find((m) => m.isError)!.id;

        (chatService.sendMessage as any).mockResolvedValueOnce({ status: 'COMPLETED', content: { message: 'Retried reply' } });
        await act(async () => { await result.current.retryMessage(errorId, 'First (fails)'); });

        const contents = result.current.messages.map((m) => m.content);
        expect(contents.slice(0, 2)).toEqual(['Second (works)', 'Second reply']);
        expect(contents[2]).toBe('First (fails)');
        expect(result.current.messages.some((m) => m.isError)).toBe(false);
    });
});
