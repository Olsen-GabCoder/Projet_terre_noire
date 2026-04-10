import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OptimizedImage from './OptimizedImage';

describe('OptimizedImage', () => {
  it('renders with correct attributes', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test" width={200} height={300} />);
    const img = screen.getByAltText('Test');
    expect(img).toHaveAttribute('width', '200');
    expect(img).toHaveAttribute('height', '300');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('uses eager loading when priority is set', () => {
    render(<OptimizedImage src="/test.jpg" alt="Priority" width={200} height={300} priority />);
    const img = screen.getByAltText('Priority');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('decoding', 'sync');
  });

  it('shows placeholder before load', () => {
    const { container } = render(<OptimizedImage src="/test.jpg" alt="Test" width={200} height={300} />);
    expect(container.querySelector('.opt-img__placeholder')).toBeInTheDocument();
  });

  it('hides placeholder after load', () => {
    const { container } = render(<OptimizedImage src="/test.jpg" alt="Test" width={200} height={300} />);
    const img = screen.getByAltText('Test');
    fireEvent.load(img);
    expect(container.querySelector('.opt-img__placeholder')).not.toBeInTheDocument();
  });

  it('shows fallback on error', () => {
    render(<OptimizedImage src="/broken.jpg" alt="Broken" width={200} height={300} fallback="/fallback.svg" />);
    const img = screen.getByAltText('Broken');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/fallback.svg');
  });

  it('uses default fallback when none specified', () => {
    render(<OptimizedImage src="/broken.jpg" alt="Broken" width={200} height={300} />);
    const img = screen.getByAltText('Broken');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/images/default-book-cover.svg');
  });
});
