"""Model calls through Google's google-genai SDK on Vertex AI.

Authentication is Application Default Credentials; project, location and model names
come from the environment. Tests swap in a fake with the same `generate` signature.
"""

from __future__ import annotations

import asyncio
import random
from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class Usage:
    input: int = 0
    output: int = 0  # includes thinking tokens, which are billed as output
    calls: int = 0

    def add(self, other: "Usage") -> None:
        self.input += other.input
        self.output += other.output
        self.calls += other.calls

    def cost(self, price_in_per_m: float, price_out_per_m: float) -> float:
        return self.input / 1e6 * price_in_per_m + self.output / 1e6 * price_out_per_m

    def to_dict(self) -> dict[str, int]:
        return {"input": self.input, "output": self.output}


@dataclass
class Reply:
    text: str
    usage: Usage
    attempts: int = 1
    # Why the model stopped ("STOP", "MAX_TOKENS", "SAFETY", …), when known.
    finish: str = ""


class Model(Protocol):
    async def generate(
        self,
        *,
        model: str,
        system: str,
        turns: list[tuple[str, str]],
        temperature: float,
        max_output_tokens: int,
        json_schema: dict[str, Any] | None = None,
    ) -> Reply: ...


class TransientError(RuntimeError):
    """Worth retrying: rate limits, server errors, dropped connections."""

    def __init__(self, message: str, rate_limited: bool = False) -> None:
        super().__init__(message)
        # Quotas refill per minute: these need a much longer wait than a server hiccup.
        self.rate_limited = rate_limited


class GenaiModel:
    def __init__(self, project: str, location: str) -> None:
        from google import genai

        self._client = genai.Client(vertexai=True, project=project, location=location)

    async def generate(
        self,
        *,
        model: str,
        system: str,
        turns: list[tuple[str, str]],
        temperature: float,
        max_output_tokens: int,
        json_schema: dict[str, Any] | None = None,
    ) -> Reply:
        from google.genai import errors, types

        contents = [types.Content(role=role, parts=[types.Part(text=text)]) for role, text in turns]
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            **({"response_mime_type": "application/json", "response_json_schema": json_schema} if json_schema else {}),
        )
        try:
            resp = await self._client.aio.models.generate_content(model=model, contents=contents, config=config)
        except errors.APIError as e:
            if e.code in (408, 429, 500, 502, 503, 504):
                raise TransientError(f"{e.code}: {e.message}", rate_limited=e.code == 429) from e
            raise
        except Exception as e:  # noqa: BLE001
            # Dropped connections surface as httpx/aiohttp errors of many kinds.
            if isinstance(e, (OSError, asyncio.TimeoutError)) or type(e).__module__.split(".")[0] in ("httpx", "httpcore", "aiohttp"):
                raise TransientError(f"{type(e).__name__}: {e}") from e
            raise
        u = resp.usage_metadata
        usage = Usage(
            input=(u.prompt_token_count or 0) if u else 0,
            output=((u.candidates_token_count or 0) + (u.thoughts_token_count or 0)) if u else 0,
            calls=1,
        )
        finish = ""
        if resp.candidates and resp.candidates[0].finish_reason:
            fr = resp.candidates[0].finish_reason
            finish = getattr(fr, "name", str(fr))
        return Reply(text=resp.text or "", usage=usage, finish=finish)


@dataclass
class Runner:
    """Runs model calls with a concurrency cap and exponential backoff on transient errors."""

    model: Model
    concurrency: int = 4
    retries: int = 5
    base_delay: float = 2.0
    # Rate limits: wait 15 s, 30 s, … up to `max_delay`, and allow more attempts.
    rate_delay: float = 15.0
    rate_retries: int = 8
    max_delay: float = 240.0
    sleep: Any = asyncio.sleep
    usage: Usage = field(default_factory=Usage)

    def __post_init__(self) -> None:
        self._sem = asyncio.Semaphore(self.concurrency)

    async def call(self, **kwargs: Any) -> Reply:
        async with self._sem:
            attempt = 0
            while True:
                attempt += 1
                try:
                    reply = await self.model.generate(**kwargs)
                    reply.attempts = attempt
                    self.usage.add(reply.usage)
                    return reply
                except TransientError as e:
                    if attempt > (self.rate_retries if e.rate_limited else self.retries):
                        raise
                    base = self.rate_delay if e.rate_limited else self.base_delay
                    delay = min(self.max_delay, base * 2 ** (attempt - 1))
                    await self.sleep(delay + random.uniform(0, delay * 0.1))
