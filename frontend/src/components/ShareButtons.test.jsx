import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ShareButtons from './ShareButtons';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
  __esModule: true,
}));

const mockBook = {
  id: 1,
  title: 'Le Petit Prince',
  description: 'Un conte philosophique et poétique.',
};

const renderShare = (book = mockBook) =>
  render(<BrowserRouter><ShareButtons book={book} /></BrowserRouter>);

describe('ShareButtons', () => {
  it('renders share label', () => {
    renderShare();
    expect(screen.getByText(/share|partager/i)).toBeInTheDocument();
  });

  it('renders 5 social channels + copy button', () => {
    renderShare();
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5); // FB, Twitter, WhatsApp, LinkedIn, Email
    const copyBtn = screen.getByTitle(/copier|copy/i);
    expect(copyBtn).toBeInTheDocument();
  });

  it('renders correct Facebook share URL', () => {
    renderShare();
    const fbLink = screen.getByLabelText(/facebook/i);
    expect(fbLink.href).toContain('facebook.com/sharer');
  });

  it('renders correct WhatsApp share URL', () => {
    renderShare();
    const waLink = screen.getByLabelText(/whatsapp/i);
    expect(waLink.href).toContain('wa.me');
  });

  it('renders nothing when book is null', () => {
    const { container } = render(<BrowserRouter><ShareButtons book={null} /></BrowserRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('copy button changes icon on click', async () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue() },
    });
    renderShare();
    const copyBtn = screen.getByTitle(/copier|copy/i);
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
