import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Header from './Header'

// Mock des contextes
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
  }),
}))

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    getTotalItems: () => 0,
  }),
}))

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({
    getWishlistCount: () => 0,
  }),
}))

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Header', () => {
  it('affiche le lien vers le catalogue', () => {
    renderWithRouter(<Header />)
    expect(screen.getByRole('link', { name: /catalogue/i })).toBeInTheDocument()
  })

  it('affiche le lien vers l\'accueil', () => {
    renderWithRouter(<Header />)
    const accueilLinks = screen.getAllByRole('link', { name: /accueil/i })
    expect(accueilLinks.length).toBeGreaterThan(0)
  })

  it('affiche un bouton de recherche avec un label accessible', () => {
    renderWithRouter(<Header />)
    const searchButtons = screen.getAllByRole('button', { name: /rechercher|recherche/i })
    expect(searchButtons.length).toBeGreaterThan(0)
  })
})
