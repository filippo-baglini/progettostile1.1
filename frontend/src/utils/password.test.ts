import { describe, it, expect } from 'vitest';
import { passwordProblem } from './password';
import { setLang, t } from '../i18n';

describe('passwordProblem', () => {
    it('accepts a password that meets every rule', () => {
        expect(passwordProblem('Ciao123!')).toBeNull();
    });

    it.each(['Ciao12!', 'ciao123!', 'CIAO123!', 'CiaoCiao!', 'Ciao1234'])('refuses %s', (password) => {
        expect(passwordProblem(password)).toBe(t().auth.passwordHint);
    });

    it('explains the rule in the current language', () => {
        setLang('it');
        expect(passwordProblem('x')).toMatch(/^Almeno 8 caratteri/);
        setLang('en');
        expect(passwordProblem('x')).toMatch(/^At least 8 characters/);
    });
});
