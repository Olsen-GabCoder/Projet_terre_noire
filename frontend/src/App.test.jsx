import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock bookService pour éviter les appels API (Home charge les livres au montage)
vi.mock('./services/bookService', () => ({
  default: {
    getBooks: vi.fn(() => Promise.resolve({ results: [] })),
  },
}))

describe('App', () => {
  it('affiche le lien d\'évitement pour l\'accessibilité', async () => {
    render(<App />)
    await waitFor(() => {
      const skipLink = screen.getByRole('link', { name: /aller au contenu principal/i })
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })
  })

  it('affiche la zone de contenu principal avec le bon id', async () => {
    render(<App />)
    await waitFor(() => {
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveAttribute('id', 'main-content')
    })
  })
})
