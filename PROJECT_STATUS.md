# Terre Noire Editions -- Etat du projet

## Vue d'ensemble

Terre Noire Editions est une maison d'edition gabonaise premium fondee en 2025 a Port-Gentil.
La plateforme comprend un catalogue en ligne, un lecteur PDF integre, un systeme de commandes,
une administration complete et un espace auteurs. Stack : React 19 + Vite 7 (frontend),
Django 5 + DRF (backend).

## Statut actuel

Vague 1 -- Foundations : Terminee (commit 6f4fa9c)

### Realisations Vague 1

- Design system v2 consolide (tokens couleurs, typographie, ombres, transitions, z-index)
- Migration uniforme des couleurs (291 occurrences vers tokens CSS)
- Accessibilite : focus-visible global, prefers-reduced-motion, focus trap sur modales
- Performance : React.lazy sur 36 routes, bundle JS initial -69% (1157 KB vers 363 KB)
- Lighthouse Desktop : 41 vers 76 | Mobile : 7 vers 46

## Roadmap

- Vague 2 : Composants atomiques (Buttons, Inputs, Links, Badges)
- Vague 3 : Composants moleculaires (BookCard, Modals, Forms, Toast)
- Vague 4 : Layouts et Pages
- Vague 5 : Etats et micro-narrations
- Vague 6 : Animations et atmosphere
- Vague 7 : Touches signees editoriales

## Stack

- Frontend : React 19, Vite 7, React Router
- Backend : Django 5, Django REST Framework, MySQL
- Tests visuels : Playwright (frontend/scripts/)
- Deploiement : Render

## Contributions

Projet proprietaire -- Terre Noire Editions.
