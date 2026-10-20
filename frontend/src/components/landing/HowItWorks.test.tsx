import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import HowItWorks from './HowItWorks';

describe('HowItWorks', () => {
    it('renders the three steps in order', () => {
        render(<HowItWorks />);
        expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
        const steps = screen.getAllByRole('listitem');
        expect(steps).toHaveLength(3);
        expect(steps[0]).toHaveTextContent('1You describe');
        expect(steps[1]).toHaveTextContent('2The stylist asks');
        expect(steps[2]).toHaveTextContent('3You get the looks');
    });
});
