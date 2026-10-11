import type { BudgetOption, ChatMessage } from '../types';

export interface SelectedOption {
  label: string;
  description: string;
}

// The text sent to the backend when a budget box is picked
export const budgetReply = (option: BudgetOption) =>
  option.max_budget === 0 ? 'My max budget is unlimited' : `My max budget is ${option.max_budget}`;

// If a user message is the reply sent by clicking one of the previous message's boxes, returns that box
export const findSelectedOption = (
  previous: ChatMessage | undefined,
  content: string
): SelectedOption | undefined => {
  if (previous?.role !== 'assistant') return undefined;
  return (
    previous.outfitGenerationOptions?.find((option) => option.value === content) ??
    previous.budgetOptions?.find((option) => budgetReply(option) === content)
  );
};
