import { describe, it, expect } from 'vitest';
import { render } from '../../utils/test-utils';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
    it('renders a busy page with placeholder blocks', () => {
        const { container } = render(<ProfileSkeleton />);
        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
        expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(5);
    });
});
