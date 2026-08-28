import json
import re

_FENCE_PATTERN = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def extract_json_object(text: str) -> dict:
    fence_match = _FENCE_PATTERN.search(text)
    candidate = fence_match.group(1) if fence_match else text

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = candidate[start : end + 1]

    return json.loads(candidate)
