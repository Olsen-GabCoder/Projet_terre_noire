# Terre Noire Editions -- Etat du projet

## Vue d'ensemble

Terre Noire Editions est une maison d'edition gabonaise premium fondee en 2025 a Port-Gentil.
La plateforme comprend un catalogue en ligne, un lecteur PDF integre, un systeme de commandes,
une administration complete et un espace auteurs. Stack : React 19 + Vite 7 (frontend),
Django 5 + DRF (backend).

## Statut actuel

Vague 1 -- Foundations : Terminee
Vague 2 -- Composants atomiques : Terminee
Vague 2.5 -- Composants atomiques (suite) : Terminee

### Realisations Vague 2.5

- Link : 4 variantes + on-dark + external auto-icon, underline slide-in animation
- TnPrice : elevation Playfair serif, 5 tailles, promo (strike + discount badge), gratuit, range
- TnStars : elevation 4 tailles, mode interactif (click-to-rate), compact, demi-etoiles
- TnDivider : 6 variantes (ornement diamant dore, gradient, dashed, warm), label central
- 4 composants React enrichis avec compatibilite ascendante BookCard/Footer/AuthorDetail
- Bundle CSS +4.5 KB (128 vers 132.5 KB), 68 nouveaux tests Playwright

### Realisations Vague 2

- Elevation Button : 7 variantes, 6 etats (hover lift, active press, disabled, loading), ombres warm
- Elevation Input : focus glow warm, etats error/valid/disabled, labels eyebrow mono
- Creation Badge centralise : 8 variantes semantiques, 3 styles (solid/soft/outline), animation pop
- 5 composants React reutilisables : TnButton, TnInput, TnTextarea, TnSelect, TnBadge
- 0 regression visuelle, bundle CSS +7 KB (121 vers 128 KB)

### Realisations Vague 1

- Design system v2 consolide (tokens couleurs, typographie, ombres, transitions, z-index)
- Migration uniforme des couleurs (291 occurrences vers tokens CSS)
- Accessibilite : focus-visible global, prefers-reduced-motion, focus trap sur modales
- Performance : React.lazy sur 36 routes, bundle JS initial -69% (1157 KB vers 363 KB)
- Lighthouse Desktop : 41 vers 76 | Mobile : 7 vers 46

## Roadmap

- ~~Vague 2 : Composants atomiques (Buttons, Inputs, Badges)~~ Terminee
- ~~Vague 2.5 : Composants atomiques (Link, TnPrice, TnStars, TnDivider)~~ Terminee
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
