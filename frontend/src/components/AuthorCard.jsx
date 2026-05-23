/**
 * AuthorCard — Extracted from Authors.jsx inline, elevated in Vague 3 P1
 *
 * Usage:
 *   <AuthorCard author={authorObject} />
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TnBadge from './ui/TnBadge';
import '../styles/AuthorCard.css';

export default function AuthorCard({ author }) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = author.photo && !imgError;
  const initial = (author.full_name || '?').charAt(0).toUpperCase();
  const booksCount = author.books_count || 0;

  return (
    <Link to={`/authors/${author.id}`} className="acard">
      <div className="acard__visual">
        <div className="acard__avatar">
          {hasPhoto ? (
            <img
              src={author.photo}
              alt={author.full_name}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="acard__initials">{initial}</div>
          )}
        </div>
        {booksCount > 0 && (
          <span className="acard__badge">
            <TnBadge variant="info" badgeStyle="soft" leftIcon={<i className="fas fa-book" />}>
              {booksCount}
            </TnBadge>
          </span>
        )}
      </div>
      <div className="acard__body">
        <h3 className="acard__name">{author.full_name || 'Auteur inconnu'}</h3>
        <p className={`acard__bio${!author.biography ? ' acard__bio--empty' : ''}`}>
          {author.biography || 'Biographie à venir'}
        </p>
        <div className="acard__cta">
          <span>Voir sa fiche</span>
          <i className="fas fa-arrow-right" />
        </div>
      </div>
    </Link>
  );
}
