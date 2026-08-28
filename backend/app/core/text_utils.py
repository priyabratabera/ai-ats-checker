import re
import unicodedata

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "so", "as", "of", "at",
    "by", "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "once",
    "here", "there", "when", "where", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "than", "too", "very", "s", "t", "can",
    "will", "just", "don", "should", "now", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "having", "do", "does", "did",
    "doing", "we", "you", "your", "our", "their", "they", "it", "its",
    "this", "that", "these", "those", "i", "he", "she", "him", "her", "his",
    "who", "whom", "which", "what", "would", "could", "shall",
    "must", "may", "might", "etc",
}

WEAK_PHRASES = [
    "responsible for",
    "duties included",
    "worked on",
    "helped with",
    "in charge of",
    "tasked with",
    "assisted with",
    "involved in",
    "participated in",
]

STRONG_VERB_SUGGESTIONS: dict[str, list[str]] = {
    "responsible for": ["Led", "Managed", "Owned"],
    "duties included": ["Delivered", "Executed", "Drove"],
    "worked on": ["Built", "Developed", "Shipped"],
    "helped with": ["Contributed to", "Supported", "Drove"],
    "in charge of": ["Directed", "Oversaw", "Led"],
    "tasked with": ["Spearheaded", "Delivered", "Owned"],
    "assisted with": ["Partnered on", "Supported", "Enabled"],
    "involved in": ["Drove", "Contributed to", "Partnered on"],
    "participated in": ["Contributed to", "Collaborated on", "Drove"],
}

_TOKEN_PATTERN = re.compile(r"[^\W\d_][\w+.#-]*|\d[\w+.#-]*", re.UNICODE)
_WORD_COUNT_PATTERN = re.compile(r"[^\W_]+(?:['-][^\W_]+)*", re.UNICODE)
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(\+?\d[\d\s().-]{8,}\d)")
URL_PATTERN = re.compile(r"\b(?:https?://|www\.)[^\s,;]+", re.IGNORECASE)


def normalize_whitespace(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def count_words(text: str) -> int:
    return len(_WORD_COUNT_PATTERN.findall(text))


def tokenize(text: str) -> list[str]:
    tokens = _TOKEN_PATTERN.findall(text.lower())
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 1]


def stem(word: str) -> str:
    w = word.lower()
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("ing") and len(w) > 5:
        return w[:-3]
    if w.endswith("ed") and len(w) > 4:
        return w[:-2]
    if w.endswith("es") and len(w) > 4:
        return w[:-2]
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]
    return w


def split_lines(text: str) -> list[str]:
    return [line.strip() for line in normalize_whitespace(text).split("\n") if line.strip()]


_BULLET_PATTERN = re.compile(r"^([•▪◦●○*\-–]|\d+[.)])\s+")


def split_into_bullets(text: str) -> list[str]:
    bullets = []
    for line in normalize_whitespace(text).split("\n"):
        stripped = line.strip()
        if _BULLET_PATTERN.match(stripped):
            bullets.append(_BULLET_PATTERN.sub("", stripped))
    return bullets


def find_weak_phrases(text: str) -> list[tuple[str, int]]:
    lower = text.lower()
    found = []
    for phrase in WEAK_PHRASES:
        start = 0
        while True:
            idx = lower.find(phrase, start)
            if idx == -1:
                break
            found.append((text[idx : idx + len(phrase)], idx))
            start = idx + len(phrase)
    return found


def contains_number(text: str) -> bool:
    return any(ch.isdigit() for ch in text)


def escape_regex(text: str) -> str:
    return re.escape(text)


def find_token_occurrences(text: str, term: str) -> list[int]:
    """
    Standalone occurrences of a short, punctuation-free term (e.g. "js") in
    text. A plain \\b...\\b would also match it inside a compound token like
    "Node.js" - "." reads as a boundary to the regex engine even though it
    isn't one semantically - so matches immediately preceded by a "mid-word
    dot" (a "." itself preceded by a letter/digit) are discarded.
    """
    pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
    indices = []
    for match in pattern.finditer(text):
        start = match.start()
        preceded_by_mid_word_dot = (
            start >= 2 and text[start - 1] == "." and text[start - 2].isalnum()
        )
        if not preceded_by_mid_word_dot:
            indices.append(start)
    return indices
