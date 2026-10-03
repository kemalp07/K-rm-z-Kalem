"""Random but consistent letter requests.

Everything that can be chosen lives in pools.yaml; this module only knows the rules
that keep a request possible: who can be whose mother, who can hold a pen, how many
letters one name may sign.
"""

from __future__ import annotations

import random
from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Person:
    name: str
    gender: str  # "erkek" | "kadın"
    age: int
    relation: str | None = None  # relation to the soldier ("annesi"); None for the soldier
    rank: str | None = None
    hometown: str | None = None
    occupation: str | None = None
    epithet: str | None = None
    # Where at home: "Hafik kazası, Kızılca karyesi" / "Üsküdar, Selamsız mahallesi".
    place: str | None = None


@dataclass
class Request:
    direction: str  # "cepheden" | "cepheye"
    sender: Person
    recipient: Person
    recipient_location: str
    writes: str  # "self" | "dictated" | "scribe"
    writer: str | None
    literacy: str  # "none" | "low" | "mid" | "high"
    voice: str
    topic: str
    hidden: str
    carelessness: str  # "none" | "low" | "high"
    sensitive_info: str
    length_label: str
    length_target: int
    package: list[str] | None = None
    prev_state: str = ""
    date: str = ""
    # Full home address line in the lorebook's pattern, without the go-between.
    home_address: str = ""
    # How the soldier stands to the other person ("oğlu"), for the request text.
    soldier_relation: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "Request":
        d = dict(d)
        d["sender"] = Person(**d["sender"])
        d["recipient"] = Person(**d["recipient"])
        return Request(**d)

    @property
    def soldier(self) -> Person:
        return self.sender if self.direction == "cepheden" else self.recipient

    @property
    def other(self) -> Person:
        return self.recipient if self.direction == "cepheden" else self.sender


class SamplerError(RuntimeError):
    pass


def _value(item: Any) -> Any:
    return item["value"] if isinstance(item, dict) and "value" in item else item


def _weight(item: Any, key: str | None = None) -> float:
    if isinstance(item, dict):
        w = item.get("weight", 1)
        if isinstance(w, dict):
            return float(w.get(key, 0)) if key else 1.0
        return float(w)
    return 1.0


class Sampler:
    def __init__(
        self,
        pools: dict[str, Any],
        seed: int,
        name_max_uses: int = 4,
        used_names: Counter[str] | None = None,
        reserved_names: set[str] | None = None,
    ) -> None:
        self.p = pools
        self.rng = random.Random(seed)
        self.name_max_uses = name_max_uses
        # Uses across the whole pool so far, plus this run as it goes.
        self.used_names: Counter[str] = Counter(used_names or {})
        self.run_pairs: set[tuple[str, str]] = set()
        # Main-story characters' names: a side letter must not borrow them.
        self.reserved = set(reserved_names or ())

    # --- weighted helpers -------------------------------------------------------------
    def pick(self, items: list[Any], key: str | None = None) -> Any:
        items = list(items)
        weights = [_weight(i, key) for i in items]
        if not items or sum(weights) <= 0:
            raise SamplerError("nothing to pick from")
        return self.rng.choices(items, weights=weights, k=1)[0]

    def pick_value(self, items: list[Any], key: str | None = None) -> Any:
        return _value(self.pick(items, key))

    # --- pieces ------------------------------------------------------------------------
    def _relation(self, direction: str, soldier_age: int) -> tuple[str, dict[str, Any], int]:
        options = []
        for name, r in self.p["relations"].items():
            if _weight(r, direction) <= 0:
                continue
            if soldier_age < r.get("soldier_min_age", 0):
                continue
            lo = max(soldier_age + r["age_offset"][0], r["min_age"])
            hi = min(soldier_age + r["age_offset"][1], r["max_age"])
            if lo <= hi:
                options.append((name, r, lo, hi))
        if not options:
            raise SamplerError(f"no relation fits a {soldier_age}-year-old soldier")
        name, r, lo, hi = self.rng.choices(options, weights=[_weight(o[1], direction) for o in options], k=1)[0]
        return name, r, self.rng.randint(lo, hi)

    def _name(self, gender: str, hometown: str | None, exclude: set[str]) -> str:
        pool = [
            n
            for n in self.p["names"][gender]
            if n not in exclude
            and n not in self.reserved
            and self.used_names[n] < self.name_max_uses
            and (hometown is None or (n, hometown) not in self.run_pairs)
        ]
        if not pool:
            raise SamplerError(f"{gender} isim havuzu tükendi (name_max_uses={self.name_max_uses})")
        return self.rng.choice(pool)

    def _occupation(self, gender: str, age: int, kind: str) -> dict[str, Any]:
        options = [
            o
            for o in self.p["occupations"]
            if o.get("who", "hepsi") in ("hepsi", gender)
            and o.get("min_age", 0) <= age <= o.get("max_age", 200)
            and o.get("where", kind) == kind
        ]
        if age < 16:
            options = [o for o in options if _value(o) in ("talebe", "çoban", "ırgat", "çiftçi")] or options
        return self.pick(options)

    def _writing(self, occupation: dict[str, Any], age: int) -> dict[str, Any]:
        allowed = occupation.get("literacy")
        options = [w for w in self.p["writing_pairs"] if not allowed or w["literacy"] in allowed]
        if age < self.p.get("min_age_self_writing", 12):
            options = [w for w in options if w["writes"] != "self"]
        if not options:
            # An occupation that demands literacy for someone too young to write: fall back.
            options = [w for w in self.p["writing_pairs"] if w["writes"] != "self"]
        return self.pick(options)

    def _sensitive(self, carelessness: str) -> str:
        s = self.p["sensitive_info"]
        if isinstance(s, list):  # a single list for everyone
            return self.pick_value(s)
        return self.pick_value(s["none"] if carelessness == "none" else s["careless"])

    def _date(self) -> str:
        d = self.p.get("dates")
        if not d:
            return ""
        month = self.pick(d["months"])
        return f"{self.rng.randint(*month['days'])} {_value(month)} {d['year']}"

    def _epithet(self, hometown: dict[str, Any], occupation: dict[str, Any]) -> str:
        style = self.pick_value(self.p["epithet_style"])
        if style == "occupation" and occupation.get("epithet", True):
            v = _value(occupation)
            return v[:1].upper() + v[1:]
        return hometown["adj"]

    # --- one request ---------------------------------------------------------------------
    def sample(self, direction: str | None = None) -> Request:
        direction = direction or self.pick_value(self.p["direction"])
        rank = self.pick_value(self.p["rank"])
        age_lo, age_hi = self.p["soldier_age"][rank]
        soldier_age = self.rng.randint(age_lo, age_hi)
        relation, rel, other_age = self._relation(direction, soldier_age)

        hometown = self.rng.choice(self.p["hometowns"])
        town = hometown["name"]
        if hometown.get("kind") == "city":
            semt = self.rng.choice(sorted(hometown["semts"]))
            mahalle = self.rng.choice(hometown["semts"][semt])
            place = f"{semt}, {mahalle} mahallesi"
        else:
            place = f"{self.rng.choice(hometown['kazas'])} kazası, {self.rng.choice(self.p['villages'])} karyesi"
        home_address = f"{town}, {place}"

        soldier_is_sender = direction == "cepheden"
        sender_gender = "erkek" if soldier_is_sender else rel["gender"]
        sender_age = soldier_age if soldier_is_sender else other_age

        sender_name = self._name(sender_gender, town, exclude=set())
        recipient_gender = rel["gender"] if soldier_is_sender else "erkek"
        recipient_name = self._name(recipient_gender, None, exclude={sender_name})

        occupation = self._occupation(sender_gender, sender_age, hometown.get("kind", "village"))
        writing = self._writing(occupation, sender_age)

        inverse = rel.get("inverse", "")
        if "/" in inverse:
            older, younger = inverse.split("/", 1)
            inverse = older if soldier_age >= other_age else younger

        sender = Person(
            name=sender_name,
            gender=sender_gender,
            age=sender_age,
            relation=None if soldier_is_sender else relation,
            rank=rank if soldier_is_sender else None,
            hometown=town,
            occupation=_value(occupation),
            epithet=self._epithet(hometown, occupation),
            place=place,
        )
        recipient = Person(
            name=recipient_name,
            gender=recipient_gender,
            age=other_age if soldier_is_sender else soldier_age,
            relation=relation if soldier_is_sender else None,
            rank=None if soldier_is_sender else rank,
            hometown=town,
            place=place,
        )
        location = home_address if soldier_is_sender else self.pick_value(self.p["fronts"])

        length = self.pick(self.p["lengths"])
        package = None
        if direction == "cepheye" and self.rng.random() < self.p.get("package_chance", 0):
            lo, hi = self.p.get("package_items_count", [1, 2])
            package = self.rng.sample(self.p["package_items"], k=self.rng.randint(lo, hi))

        carelessness = self.pick_value(self.p["carelessness"][direction])
        req = Request(
            direction=direction,
            sender=sender,
            recipient=recipient,
            recipient_location=location,
            writes=writing["writes"],
            writer=None if writing["writes"] == "self" else self.rng.choice(self.p["writers"][writing["writes"]][direction]),
            literacy=writing["literacy"],
            voice=self.rng.choice(self.p["voices"]),
            topic=self.rng.choice(self.p["topics"][direction]),
            hidden=self.pick_value(self.p["hidden"][direction]),
            carelessness=carelessness,
            sensitive_info=self._sensitive(carelessness),
            length_label=_value(length),
            length_target=self.rng.randint(*length["words"]),
            package=package,
            soldier_relation=inverse,
            prev_state=self.pick_value(self.p["prev_state"]),
            date=self._date(),
            home_address=home_address,
        )

        self.used_names[sender_name] += 1
        self.used_names[recipient_name] += 1
        self.run_pairs.add((sender_name, town))
        return req

    def batch(self, count: int, direction: str = "mixed") -> list[Request]:
        out = []
        for i in range(count):
            if direction == "mixed":
                d = "cepheden" if i % 2 == 0 else "cepheye"
            else:
                d = direction
            out.append(self.sample(d))
        return out
