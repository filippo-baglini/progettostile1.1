import { describe, it, expect } from 'vitest';
import { passwordProblem, PASSWORD_HINT } from './password';

describe('passwordProblem', () => {
    it('accepts a password that meets every rule', () => {
        expect(passwordProblem('Ciao123!')).toBeNull();
    });

    it.each(['Ciao12!', 'ciao123!', 'CIAO123!', 'CiaoCiao!', 'Ciao1234'])('refuses %s', (password) => {
        expect(passwordProblem(password)).toBe(PASSWORD_HINT);
    });
});
