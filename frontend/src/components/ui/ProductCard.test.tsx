import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductCard from './ProductCard';
import type { OutfitItem } from '../../types';

describe('ProductCard Component', () => {
    const mockProduct: OutfitItem = {
        id: '1',
        name: 'Test Product',
        imageUrl: 'https://example.com/jacket.jpg',
        price: 99.99,
        brand: 'FashionBrand',
        link: 'https://example.com/shop/jacket',
        category: 'jacket'
    };

    it('renders product details correctly', () => {
        render(<ProductCard item={mockProduct} />);

        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByText('€99.99')).toBeInTheDocument();
        expect(screen.getByText('FashionBrand')).toBeInTheDocument();
        expect(screen.getByAltText('Test Product')).toHaveAttribute('src', 'https://example.com/jacket.jpg');
    });

    it('shows an owned piece as part of the wardrobe, with no price or shop button', () => {
        render(<ProductCard item={{ ...mockProduct, price: 0, link: undefined, owned: true }} />);

        expect(screen.getByText('Yours')).toBeInTheDocument();
        expect(screen.getByText('From your wardrobe')).toBeInTheDocument();
        expect(screen.queryByText('€0.00')).not.toBeInTheDocument();
        expect(screen.queryByText('IN STOCK')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('links to the shop in a new tab', () => {
        render(<ProductCard item={mockProduct} />);

        const shop = screen.getByRole('link', { name: 'Shop Test Product' });
        expect(shop).toHaveAttribute('href', 'https://example.com/shop/jacket');
        expect(shop).toHaveAttribute('target', '_blank');
        expect(shop).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('has no shop link when there is none', () => {
        render(<ProductCard item={{ ...mockProduct, link: undefined }} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('marks a sold-out piece', () => {
        render(<ProductCard item={{ ...mockProduct, available: false }} />);
        expect(screen.getByText('Out of stock')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
