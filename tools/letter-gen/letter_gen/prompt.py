"""Builds what goes to the model for one request, entirely from the card and lorebook."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .sources import Card, LoreEntry, select_entries


@dataclass
class Prompt:
    system: str
    # Few-shot turns from the card's examples: ("user" | "model", text).
    turns: list[tuple[str, str]]
    user: str
    lore_used: list[str]

    def as_text(self) -> str:
        parts = ["=== SYSTEM ===", self.system]
        for role, text in self.turns:
            parts += [f"=== {role.upper()} (örnek) ===", text]
        parts += ["=== USER ===", self.user]
        return "\n\n".join(parts)


def _macros(text: str, user: str, char: str) -> str:
    return text.replace("{{user}}", user).replace("{{char}}", char)


def example_turns(mes_example: str, user: str, char: str) -> list[tuple[str, str]]:
    """Split mes_example on <START>; '{{user}}:' lines open user turns, '{{char}}:' model turns."""
    turns: list[tuple[str, str]] = []
    for block in re.split(r"<START>", mes_example, flags=re.IGNORECASE):
        role: str | None = None
        buf: list[str] = []

        def flush() -> None:
            if role and "\n".join(buf).strip():
                turns.append((role, _macros("\n".join(buf).strip(), user, char)))

        for line in block.splitlines():
            m = re.match(r"^\s*\{\{(user|char)\}\}:\s?(.*)$", line)
            if m:
                flush()
                role = "user" if m.group(1) == "user" else "model"
                buf = [m.group(2)]
            elif role:
                buf.append(line)
        flush()
    return turns


def build(card: Card, lore: list[LoreEntry], request_text: str, user_name: str) -> Prompt:
    char = card.name
    entries = select_entries(lore, request_text)
    system_parts = [card.system_prompt, card.description] + [e.content for e in entries]
    system = _macros("\n\n".join(p.strip() for p in system_parts if p and p.strip()), user_name, char)
    reminders = [card.depth_prompt, card.post_history_instructions]
    user = "\n\n".join([request_text] + [_macros(r.strip(), user_name, char) for r in reminders if r and r.strip()])
    return Prompt(
        system=system,
        turns=example_turns(card.mes_example, user_name, char),
        user=user,
        lore_used=[e.comment or e.uid for e in entries],
    )
