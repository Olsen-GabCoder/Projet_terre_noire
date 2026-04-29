"""
Client Anthropic centralisé pour Frollot.
Gère : appels Claude, cache, quota utilisateur, logging.
"""
import hashlib
import json
import logging
import time

from django.conf import settings
from django.core.cache import cache

import anthropic

logger = logging.getLogger(__name__)

# Singleton client
_client = None


def get_client():
    """Retourne le client Anthropic (singleton)."""
    global _client
    if _client is None:
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY non configuré dans settings. "
                "Ajoutez ANTHROPIC_API_KEY dans votre fichier .env"
            )
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


# ─── Quota utilisateur ────────────────────────────────────────────

def _quota_key(user_id):
    return f"ai_quota:{user_id}"


def check_quota(user_id):
    """Vérifie si l'utilisateur n'a pas dépassé son quota journalier."""
    key = _quota_key(user_id)
    count = cache.get(key, 0)
    limit = getattr(settings, 'AI_DAILY_QUOTA', 50)
    return count < limit


def increment_quota(user_id):
    """Incrémente le compteur de requêtes IA de l'utilisateur."""
    key = _quota_key(user_id)
    count = cache.get(key, 0)
    # Expire à minuit (max 24h)
    cache.set(key, count + 1, timeout=86400)


def get_quota_remaining(user_id):
    """Retourne le nombre de requêtes IA restantes."""
    key = _quota_key(user_id)
    count = cache.get(key, 0)
    limit = getattr(settings, 'AI_DAILY_QUOTA', 50)
    return max(0, limit - count)


# ─── Cache des réponses IA ────────────────────────────────────────

def _cache_key(prompt_type, identifier, extra=''):
    """Génère une clé de cache unique pour une requête IA."""
    raw = f"{prompt_type}:{identifier}:{extra}"
    h = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"ai:{prompt_type}:{h}"


def get_cached(prompt_type, identifier, extra=''):
    """Retourne le résultat caché si disponible."""
    key = _cache_key(prompt_type, identifier, extra)
    return cache.get(key)


def set_cached(prompt_type, identifier, result, extra='', ttl=None):
    """Cache un résultat IA."""
    key = _cache_key(prompt_type, identifier, extra)
    if ttl is None:
        ttl = getattr(settings, 'AI_CACHE_TTL', 3600)
    cache.set(key, result, timeout=ttl)


def invalidate_cache(prompt_type, identifier, extra=''):
    """Invalide un résultat caché."""
    key = _cache_key(prompt_type, identifier, extra)
    cache.delete(key)


# ─── Appel principal à Claude ─────────────────────────────────────

def ask_claude(
    system_prompt,
    user_message,
    model=None,
    max_tokens=1024,
    temperature=0.7,
    prompt_type='generic',
    cache_id=None,
    cache_ttl=None,
    user_id=None,
):
    """
    Appel centralisé à Claude.

    Args:
        system_prompt: Instructions système
        user_message: Message utilisateur
        model: Modèle Claude (défaut: settings.AI_MODEL)
        max_tokens: Limite de tokens en sortie
        temperature: Créativité (0=déterministe, 1=créatif)
        prompt_type: Type de prompt (pour cache et logging)
        cache_id: Identifiant pour le cache (None = pas de cache)
        cache_ttl: TTL du cache en secondes
        user_id: ID utilisateur (pour quota)

    Returns:
        str: Réponse de Claude

    Raises:
        RuntimeError: Si API key manquante
        anthropic.RateLimitError: Si rate limit Anthropic atteint
        QuotaExceededError: Si quota utilisateur dépassé
    """
    # Vérifier quota
    if user_id and not check_quota(user_id):
        raise QuotaExceededError(
            f"Quota IA journalier atteint. "
            f"Réessayez demain ou attendez la réinitialisation."
        )

    # Vérifier cache
    if cache_id:
        cached = get_cached(prompt_type, cache_id)
        if cached:
            logger.debug("AI cache hit: %s:%s", prompt_type, cache_id)
            return cached

    # Appel Claude
    if model is None:
        model = getattr(settings, 'AI_MODEL', 'claude-sonnet-4-20250514')

    client = get_client()
    start = time.time()

    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        result = response.content[0].text
        elapsed = time.time() - start

        logger.info(
            "AI call: type=%s model=%s tokens_in=%d tokens_out=%d time=%.2fs",
            prompt_type, model,
            response.usage.input_tokens,
            response.usage.output_tokens,
            elapsed,
        )

        # Incrémenter quota
        if user_id:
            increment_quota(user_id)

        # Mettre en cache
        if cache_id:
            set_cached(prompt_type, cache_id, result, ttl=cache_ttl)

        return result

    except anthropic.RateLimitError:
        logger.warning("Anthropic rate limit atteint pour prompt_type=%s", prompt_type)
        raise
    except anthropic.APIError as e:
        logger.error("Anthropic API error: %s", e)
        raise


def ask_claude_json(system_prompt, user_message, **kwargs):
    """
    Comme ask_claude mais parse la réponse en JSON.
    Ajoute automatiquement l'instruction de répondre en JSON.
    """
    system_prompt += "\n\nRéponds UNIQUEMENT en JSON valide, sans markdown, sans ```."
    raw = ask_claude(system_prompt, user_message, **kwargs)

    # Nettoyer la réponse (enlever les ```json si présent)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    return json.loads(cleaned)


# ─── Exceptions ───────────────────────────────────────────────────

class QuotaExceededError(Exception):
    pass
