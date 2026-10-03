from collections import Counter

import pytest

from letter_gen.sampler import Sampler


def _many(pools, n=1000, seed=7, **kw):
    s = Sampler(pools, seed=seed, name_max_uses=10**6, **kw)
    return [s.sample() for _ in range(n)]


def test_same_seed_same_requests(pools):
    a = [r.to_dict() for r in _many(pools, 50, seed=3)]
    b = [r.to_dict() for r in _many(pools, 50, seed=3)]
    assert a == b


def test_writing_and_literacy_are_never_impossible(pools):
    for r in _many(pools):
        assert not (r.writes == "self" and r.literacy == "none")
        if r.writes == "self":
            assert r.writer is None
            assert r.sender.age >= pools["min_age_self_writing"]
        else:
            assert r.writer


def test_occupation_literacy_is_respected(pools):
    rules = {o["value"]: o.get("literacy") for o in pools["occupations"]}
    for r in _many(pools):
        allowed = rules[r.sender.occupation]
        if allowed and r.sender.age >= pools["min_age_self_writing"]:
            assert r.literacy in allowed, (r.sender.occupation, r.literacy)


def test_relation_matches_gender_and_age(pools):
    rels = pools["relations"]
    for r in _many(pools):
        soldier, other = r.soldier, r.other
        rel = rels[other.relation]
        assert soldier.gender == "erkek"
        assert other.gender == rel["gender"]
        assert other.name in pools["names"][rel["gender"]]
        assert rel["min_age"] <= other.age <= rel["max_age"]
        lo, hi = rel["age_offset"]
        assert soldier.age + lo <= other.age <= soldier.age + hi
        if other.relation == "annesi":
            assert other.age - soldier.age >= 16
        if other.relation in ("oğlu", "kızı"):
            assert soldier.age - other.age >= 16


def test_sender_name_and_hometown_not_repeated_in_a_run(pools):
    reqs = _many(pools, 300, seed=11)
    pairs = Counter((r.sender.name, r.sender.hometown) for r in reqs)
    assert max(pairs.values()) == 1


def test_name_use_limit_counts_existing_pool(pools):
    s = Sampler(pools, seed=1, name_max_uses=4, used_names=Counter({"Mehmet": 4, "Fatma": 3}))
    reqs = [s.sample() for _ in range(150)]
    names = Counter()
    for r in reqs:
        names[r.sender.name] += 1
        names[r.recipient.name] += 1
    assert names["Mehmet"] == 0
    assert names["Fatma"] <= 1
    assert max(names.values()) <= 4


def test_exhausted_names_raise(pools):
    s = Sampler(pools, seed=1, name_max_uses=1)
    with pytest.raises(Exception, match="tükendi"):
        for _ in range(500):
            s.sample()


def test_carelessness_defaults(pools):
    reqs = _many(pools, 2000, seed=5)
    to_front = [r for r in reqs if r.direction == "cepheye"]
    assert {r.carelessness for r in to_front} == {"none"}
    from_front = Counter(r.carelessness for r in reqs if r.direction == "cepheden")
    total = sum(from_front.values())
    assert 0.42 < from_front["none"] / total < 0.58
    assert 0.09 < from_front["high"] / total < 0.21


def test_ranks_and_packages(pools):
    reqs = _many(pools, 2000, seed=9)
    ranks = Counter(r.soldier.rank for r in reqs)
    assert 0.53 < ranks["er"] / len(reqs) < 0.67
    assert all(r.package is None for r in reqs if r.direction == "cepheden")
    assert any(r.package for r in reqs if r.direction == "cepheye")


def test_mixed_batch_is_half_and_half(pools):
    s = Sampler(pools, seed=2, name_max_uses=100)
    reqs = s.batch(10, "mixed")
    assert Counter(r.direction for r in reqs) == {"cepheden": 5, "cepheye": 5}
