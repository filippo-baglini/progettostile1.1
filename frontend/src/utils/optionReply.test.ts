import { describe, it, expect } from 'vitest';
import { findSelectedOption } from './optionReply';
import type { ChatMessage } from '../types';

const assistant: ChatMessage = {
    id: 'a1', role: 'assistant', content: 'Pick one', timestamp: new Date(),
    outfitGenerationOptions: [{ id: 'o1', label: 'Streetwear Edge', description: 'Baggy and bold', value: 'Show me the Streetwear Edge look' }],
    budgetOptions: [
        { label: 'Max €100', min_budget: 0, max_budget: 100, description: 'Good value' },
        { label: 'No Limit', min_budget: 0, max_budget: 0, description: 'Pure luxury' },
    ],
};

describe('findSelectedOption', () => {
    it('finds the outfit or budget box a reply came from', () => {
        expect(findSelectedOption(assistant, 'Show me the Streetwear Edge look')?.label).toBe('Streetwear Edge');
        expect(findSelectedOption(assistant, 'My max budget is 100')?.label).toBe('Max €100');
        expect(findSelectedOption(assistant, 'My max budget is unlimited')?.label).toBe('No Limit');
    });

    it('ignores typed replies and messages without a preceding assistant poll', () => {
        expect(findSelectedOption(assistant, 'something else')).toBeUndefined();
        expect(findSelectedOption(undefined, 'My max budget is 100')).toBeUndefined();
        expect(findSelectedOption({ ...assistant, role: 'user' }, 'My max budget is 100')).toBeUndefined();
    });
});
