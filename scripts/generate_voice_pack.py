#!/usr/bin/env python3
"""
Generates a 100% consistent studio-quality neural human voice pack
(en-US-AvaMultilingualNeural) for Let's Go, Spell with Eevee!
stored in public/assets/audio/ + manifest.json.

Covers EVERY spoken cue across the entire game so robotic browser TTS
(window.speechSynthesis) is never needed during normal gameplay:
- All 90 curriculum words, focus words, and introductions
- All 56 Kanto Pokémon names and "Gotcha!" catch callouts
- All 26 A-Z Safari prompts ("Which letter makes the M sound, like map?") & Explore cues
- All phoneme tile tap sounds (clean natural cues, zero awkward "Mm" hums)
- All Paw-Slide blending steps & successive syllable chunks
- All Heart-Word hints
- All Zone 4 Pokémon Center clinic prompts & curative hints
- All 7 Partner Gym moves & Eevee Closet accessories
- All 10 Overworld town/landmark names & lock messages
- All 8 Kanto Badge ceremony announcements
- All 9 Blending Dojo word chains (prompts & celebrations)
- All 26 Switch Menu Trainer prompts & hints
- All UI encouragement & coaching cues
"""
import asyncio
import json
import re
from pathlib import Path
import edge_tts

VOICE = "en-US-AvaMultilingualNeural"
RATE = "-4%"
ROOT = Path("/home/antigravity/craiz99/spelling-game")
OUT_DIR = ROOT / "public" / "assets" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_key(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return cleaned[:90]


def clean_pokemon_speech(text: str) -> str:
    """Apply clear natural phonetic pronunciation for Pokémon & game terms."""
    replacements = [
        (r"\bEEVEE\b", "Ee-vee"),
        (r"\bEevee\b", "Ee-vee"),
        (r"\beevee\b", "Ee-vee"),
        (r"\bPSYDUCK\b", "Sigh-duck"),
        (r"\bPsyduck\b", "Sigh-duck"),
        (r"\bpsyduck\b", "Sigh-duck"),
        (r"\bSEEL\b", "seal"),
        (r"\bSeel\b", "seal"),
        (r"\bseel\b", "seal"),
        (r"\bPIKACHU\b", "Pee-kah-choo"),
        (r"\bPikachu\b", "Pee-kah-choo"),
        (r"\bVULPIX\b", "Vul-pix"),
        (r"\bVulpix\b", "Vul-pix"),
        (r"\bONIX\b", "On-ix"),
        (r"\bOnix\b", "On-ix"),
        (r"\bGYARADOS\b", "Gair-uh-dos"),
        (r"\bGyarados\b", "Gair-uh-dos"),
        (r"\bMEWTWO\b", "Mew-two"),
        (r"\bMewtwo\b", "Mew-two"),
        (r"\bSNORLAX\b", "Snore-lax"),
        (r"\bSnorlax\b", "Snore-lax"),
        (r"\bCHANSEY\b", "Chan-see"),
        (r"\bChansey\b", "Chan-see"),
        (r"\bPOKÉ BALL\b", "Pokay Ball"),
        (r"\bPoké Ball\b", "Pokay Ball"),
        (r"\bPOKÉMON\b", "Pokay-mon"),
        (r"\bPokémon\b", "Pokay-mon"),
        (r"\bDEX\b", "Dex"),
        (r"\bBRN\b", "burn"),
        (r"\bFRZ\b", "freeze"),
        (r"\bPAR\b", "paralyze"),
        (r"\bPSN\b", "poison"),
        (r"\bSLP\b", "sleep"),
    ]
    out = text
    for pat, repl in replacements:
        out = re.sub(pat, repl, out)
    return out


# Clean, natural spoken phonics cues (NO weird "mmm" / "sss" / "fff" gibberish!)
PHONEME_SPOKEN = {
    "a_short": "ah, like apple",
    "e_short": "eh, like egg",
    "i_short": "ih, like in",
    "o_short": "aw, like on",
    "u_short": "uh, like up",
    "a_long": "A, like save",
    "e_long": "E, like me",
    "i_long": "I, like ice",
    "o_long": "O, like go",
    "u_long": "oo, like you",
    "b": "B, like ball",
    "c": "C, like cat",
    "d": "D, like dog",
    "f": "F, like fish",
    "g": "G, like go",
    "h": "H, like hat",
    "j": "J, like jump",
    "k": "K, like kite",
    "l": "L, like lion",
    "m": "M, like map",
    "n": "N, like net",
    "p": "P, like pig",
    "qu": "Q U, like queen",
    "r": "R, like run",
    "s": "S, like sun",
    "t": "T, like top",
    "v": "V, like van",
    "w": "W, like whale",
    "x": "X, like box",
    "y_cons": "Y, like yes",
    "z": "Z, like zebra",
    "sh": "sh, like shop",
    "ch": "ch, like chat",
    "tch": "ch, like catch",
    "th": "th, like thin",
    "th_voiced": "th, like the",
    "wh": "wh, like whip",
    "ck": "K, like duck",
    "ea": "E, like heal",
    "ee": "E, like see",
    "ay": "A, like play",
    "ai": "A, like tail",
    "ar": "ar, like star",
    "er": "er, like water",
    "ur": "er, like burn",
    "oo_short": "oo, like good",
    "ow_long": "O, like grow",
    "ll": "L, like ball",
    "ff": "F, like puff",
    "ss": "S, like grass",
    "zz": "Z, like buzz",
    "ce": "S, like ice",
    "ve": "V, like save",
    "ke": "K, like wake",
    "te": "T, like bite",
    "le": "ul, like tackle",
    "re": "R, like fire",
    "igh": "I, like fight",
    "tion": "shun, like potion",
    "schwa": "uh, like the",
    "y_vowel": "E, like candy",
    "ie_short": "eh, like friend",
    "uy": "I, like buy",
    "a_aw": "aw, like ball",
}

# Clean phonetic renderings for isolated blending chunks & single-sound steps
# so AvaMultilingualNeural speaks every blending bubble smoothly and clearly!
BLEND_SPOKEN_MAP = {
    # Single continuant/stop phoneme blending cues (from phonemes.ts)
    "mmmm": "M",
    "mmm": "M",
    "ssss": "S",
    "sss": "S",
    "ffff": "F",
    "fff": "F",
    "nnnn": "N",
    "nnn": "N",
    "rrrr": "R",
    "rrr": "R",
    "llll": "L",
    "lll": "L",
    "vvvv": "V",
    "vvv": "V",
    "zzzz": "Z",
    "zzz": "Z",
    "shhhh": "sh",
    "shhh": "sh",
    "thhhh": "th",
    "thhh": "th",
    "thh": "th",
    "hh": "H",
    "hhh": "H",
    "ww": "W",
    "yy": "Y",
    "b": "B",
    "c": "C",
    "d": "D",
    "f": "F",
    "g": "G",
    "h": "H",
    "j": "J",
    "k": "K",
    "l": "L",
    "m": "M",
    "n": "N",
    "p": "P",
    "r": "R",
    "s": "S",
    "t": "T",
    "v": "V",
    "w": "W",
    "z": "Z",
    "ch": "ch",
    "kw": "kw",
    "ks": "ks",
    "ul": "ul",
    # Vowel blending cues
    "aaaa": "ah",
    "aah": "ah",
    "eeee": "eh",
    "ehh": "eh",
    "iiii": "ih",
    "oooo": "aw",
    "uuuu": "uh",
    "uuu": "oo",
    "ayyy": "ay",
    "eyee": "eye",
    "ohhh": "oh",
    "awww": "aw",
    "arrr": "ar",
    "errr": "er",
    # Successive glued CV / CVC syllable chunks from curriculum & word chains
    "ba": "bah",
    "bah": "bah",
    "baw": "baw",
    "be": "beh",
    "beh": "beh",
    "ber": "burr",
    "bi": "bih",
    "bo": "bah",
    "bu": "buh",
    "buh": "buh",
    "bul": "bull",
    "ca": "kah",
    "cha": "chah",
    "choo": "choo",
    "co": "kah",
    "da": "dah",
    "dah": "dah",
    "de": "deh",
    "di": "dih",
    "do": "dah",
    "du": "duh",
    "duh": "duh",
    "eev": "eeve",
    "em": "em",
    "fa": "fah",
    "fas": "fass",
    "fi": "fih",
    "fih": "fih",
    "fo": "fah",
    "foo": "foo",
    "fr": "fr",
    "freh": "freh",
    "fren": "fren",
    "fu": "fuh",
    "fuh": "fuh",
    "fye": "fie",
    "ga": "gah",
    "go": "go",
    "goo": "goo",
    "gr": "gr",
    "gu": "guh",
    "guh": "guh",
    "ha": "hah",
    "hah": "hah",
    "he": "heh",
    "hee": "hee",
    "heh": "heh",
    "hel": "hell",
    "hi": "hih",
    "ho": "hah",
    "hu": "huh",
    "huh": "huh",
    "ju": "juh",
    "juh": "juh",
    "jum": "jum",
    "ka": "kah",
    "kan": "can",
    "kand": "cand",
    "ko": "koh",
    "koh": "koh",
    "kohl": "coal",
    "kwee": "kwee",
    "kwih": "kwih",
    "kye": "kie",
    "la": "lah",
    "lax": "lax",
    "li": "lih",
    "lye": "lie",
    "ma": "mah",
    "me": "me",
    "mi": "mih",
    "mo": "mah",
    "mu": "muh",
    "na": "nah",
    "ne": "neh",
    "neh": "neh",
    "ni": "nih",
    "no": "no",
    "ow": "ow",
    "pa": "pah",
    "pah": "pah",
    "par": "par",
    "pe": "peh",
    "peh": "peh",
    "pi": "pih",
    "pih": "pih",
    "pl": "pl",
    "po": "poh",
    "poh": "poh",
    "pu": "puh",
    "puh": "puh",
    "qu": "kw",
    "qui": "kwih",
    "ra": "rah",
    "re": "reh",
    "ree": "ree",
    "reh": "reh",
    "res": "ress",
    "ru": "ruh",
    "ruh": "ruh",
    "sa": "sah",
    "san": "san",
    "se": "seh",
    "seh": "seh",
    "sha": "shah",
    "shah": "shah",
    "shi": "shih",
    "shih": "shih",
    "sho": "shah",
    "si": "sih",
    "sih": "sih",
    "so": "sah",
    "st": "st",
    "su": "suh",
    "suh": "suh",
    "sw": "sw",
    "swih": "swih",
    "ta": "tah",
    "tah": "tah",
    "tay": "tay",
    "te": "teh",
    "th": "th",
    "ti": "tih",
    "to": "tah",
    "tu": "tuh",
    "va": "vah",
    "ve": "veh",
    "vi": "vih",
    "wa": "wah",
    "way": "way",
    "wh": "wh",
    "whi": "wih",
    "wi": "wih",
    "wih": "wih",
    "ye": "yeh",
    "yeh": "yeh",
    "ze": "zee",
    "zee": "zee",
    "ap": "app",
    "an": "an",
    "ant": "ant",
    "anti": "anty",
    "awake": "awake",
}


def parse_curriculum():
    src = (ROOT / "src" / "data" / "curriculum.ts").read_text(encoding="utf-8")
    entries = []
    blocks = re.split(r"\n  \{", src)
    for b in blocks[1:]:
        id_m = re.search(r"id:\s*'([^']+)'", b)
        disp_m = re.search(r"displayWord:\s*'([^']+)'", b)
        focus_m = re.search(r"focusWord:\s*'([^']+)'", b)
        zone_m = re.search(r"zoneId:\s*(\d+)", b)
        poke_m = re.search(r"pokemonName:\s*'([^']+)'", b)
        status_m = re.search(r"statusCondition:\s*'([^']+)'", b)
        slug_m = re.search(r"itemSlug:\s*'([^']+)'", b)
        sent_m = re.search(r"everydaySentence:\s*'((?:\\'|[^'])+)'", b)
        chunks_m = re.search(r"successiveChunkCues:\s*\[([^\]]+)\]", b)
        units = re.findall(r"letters:\s*'([^']+)',\s*phonemeKey:\s*'([^']+)'", b)
        hearts = re.findall(r"heartHint:\s*'((?:\\'|[^'])+)'", b)
        if id_m and disp_m and focus_m:
            sent = sent_m.group(1).replace("\\'", "'") if sent_m else ""
            chunks = (
                [c.strip().strip("'\"") for c in chunks_m.group(1).split(",") if c.strip()]
                if chunks_m
                else []
            )
            entries.append(
                {
                    "id": id_m.group(1),
                    "displayWord": disp_m.group(1),
                    "focusWord": focus_m.group(1),
                    "zoneId": int(zone_m.group(1)) if zone_m else 1,
                    "pokemonName": poke_m.group(1) if poke_m else "Pikachu",
                    "statusCondition": status_m.group(1) if status_m else None,
                    "itemSlug": slug_m.group(1) if slug_m else None,
                    "sentence": sent,
                    "chunks": chunks,
                    "units": units,
                    "hearts": [h.replace("\\'", "'") for h in hearts],
                }
            )
    return entries


def parse_pokemon():
    src = (ROOT / "src" / "data" / "pokemonCatalog.ts").read_text(encoding="utf-8")
    pokes = []
    for m in re.finditer(
        r"id:\s*(\d+),\s*name:\s*(?:'((?:\\'|[^'])+)'|\"([^\"]+)\"),\s*spokenName:\s*'((?:\\'|[^'])+)'",
        src,
    ):
        name = (m.group(2) or m.group(3)).replace("\\'", "'")
        spoken = m.group(4).replace("\\'", "'")
        pokes.append((int(m.group(1)), name, spoken))
    return pokes


def parse_alphabet():
    src = (ROOT / "src" / "data" / "alphabet.ts").read_text(encoding="utf-8")
    items = []
    for m in re.finditer(
        r"letter:\s*'([A-Z])'.*?phonemeKey:\s*'([^']+)'.*?keyword:\s*'([^']+)'",
        src,
    ):
        items.append((m.group(1), m.group(2), m.group(3)))
    return items


def parse_phonemes_blending():
    src = (ROOT / "src" / "data" / "phonemes.ts").read_text(encoding="utf-8")
    cues = set()
    for m in re.finditer(r"blendingCue:\s*'([^']+)'", src):
        cues.add(m.group(1).lower())
    return cues


def parse_rewards():
    src = (ROOT / "src" / "data" / "rewards.ts").read_text(encoding="utf-8")
    badges = []
    for m in re.finditer(
        r"id:\s*'([^']+)',\s*name:\s*(?:'((?:\\'|[^'])+)'|\"([^\"]+)\"),\s*subtitle:[^\n]+\n\s*description:\s*'((?:\\'|[^'])+)'",
        src,
    ):
        bname = (m.group(2) or m.group(3)).replace("\\'", "'")
        badges.append((m.group(1), bname, m.group(4).replace("\\'", "'")))

    accessories = []
    for m in re.finditer(
        r"id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*slot:\s*'[^']+'",
        src,
    ):
        accessories.append((m.group(1), m.group(2)))

    moves = []
    for m in re.finditer(
        r"id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*elementType:[^\n]+\n\s*starsRequired:[^\n]+\n\s*spokenCallout:\s*'([^']+)'",
        src,
    ):
        moves.append((m.group(1), m.group(2), m.group(3)))

    return badges, accessories, moves


def parse_landmarks():
    src = (ROOT / "src" / "engine" / "overworldEngine.ts").read_text(encoding="utf-8")
    items = []
    for m in re.finditer(r"id:\s*'([^']+)',\s*name:\s*['\"]([^'\"]+)['\"]", src):
        items.append((m.group(1), m.group(2)))
    return items


def parse_menu_cards():
    src = (ROOT / "src" / "data" / "menuDecks.ts").read_text(encoding="utf-8")
    cards = []
    blocks = re.split(r"\n  \{", src)
    for b in blocks[1:]:
        id_m = re.search(r"id:\s*'([^']+)'", b)
        deck_m = re.search(r"deckId:\s*'([^']+)'", b)
        lbl_m = re.search(r"label:\s*'([^']+)'", b)
        focus_m = re.search(r"focusWord:\s*'([^']+)'", b)
        prompt_m = re.search(r"prompt:\s*'((?:\\'|[^'])+)'", b)
        hint_m = re.search(r"spokenHint:\s*'((?:\\'|[^'])+)'", b)
        slug_m = re.search(r"itemSlug:\s*'([^']+)'", b)
        tag_m = re.search(r"statusTag:\s*'([^']+)'", b)
        units = re.findall(r"letters:\s*'([^']+)',\s*phonemeKey:\s*'([^']+)'", b)
        hearts = re.findall(r"heartHint:\s*'((?:\\'|[^'])+)'", b)
        if id_m and lbl_m and prompt_m:
            cards.append(
                {
                    "id": id_m.group(1),
                    "deckId": deck_m.group(1) if deck_m else "",
                    "label": lbl_m.group(1),
                    "focusWord": focus_m.group(1) if focus_m else lbl_m.group(1),
                    "prompt": prompt_m.group(1).replace("\\'", "'"),
                    "spokenHint": hint_m.group(1).replace("\\'", "'") if hint_m else "",
                    "itemSlug": slug_m.group(1) if slug_m else None,
                    "statusTag": tag_m.group(1) if tag_m else None,
                    "units": units,
                    "hearts": [h.replace("\\'", "'") for h in hearts],
                }
            )
    return cards


def parse_word_chains():
    src = (ROOT / "src" / "data" / "wordChains.ts").read_text(encoding="utf-8")
    chains = []
    chain_blocks = re.split(r"\n  \{(?=\n    id:\s*'chain-)", src)
    for cb in chain_blocks[1:]:
        cid_m = re.search(r"id:\s*'([^']+)'", cb)
        if not cid_m:
            continue
        cid = cid_m.group(1)
        steps = []
        step_blocks = re.split(r"\n      \{", cb)
        for sb in step_blocks[1:]:
            w_m = re.search(r"word:\s*'([^']+)'", sb)
            sent_m = re.search(r"everydaySentence:\s*'((?:\\'|[^'])+)'", sb)
            sp_m = re.search(r"spokenPrompt:\s*'((?:\\'|[^'])+)'", sb)
            units = re.findall(r"letters:\s*'([^']+)',\s*phonemeKey:\s*'([^']+)'", sb)
            if w_m and sp_m:
                steps.append(
                    {
                        "word": w_m.group(1),
                        "sentence": sent_m.group(1).replace("\\'", "'") if sent_m else "",
                        "spokenPrompt": sp_m.group(1).replace("\\'", "'"),
                        "units": units,
                    }
                )
        chains.append({"id": cid, "steps": steps})
    return chains


STATUS_DESCRIPTIONS = {
    "BRN": "has a hot burn",
    "FRZ": "is frozen in chilly ice",
    "PAR": "has electric static tingles",
    "PSN": "has purple poison bubbles",
    "SLP": "fell fast asleep",
    "HP": "needs energy and healing",
    "ITEM": "needs a helpful curative",
}


def build_jobs():
    jobs = {}  # manifest_key -> (filename, spoken_text)
    blend_cues = set()
    heart_hints = set()

    pokemon_spoken_lookup = {}
    for pid, name, spoken_name in parse_pokemon():
        pokemon_spoken_lookup[name.lower()] = spoken_name
        jobs[f"pokemon:{name.lower()}"] = (f"p_{pid}.mp3", f"{spoken_name}!")
        jobs[f"caught:{name.lower()}"] = (
            f"c_{pid}.mp3",
            f"Gotcha! {spoken_name} joined your team!",
        )

    menu_cards = parse_menu_cards()
    medicine_items = [c for c in menu_cards if c["deckId"] == "medicine"]

    # 1. Curriculum words, focus words, introductions, Zone 4 clinic prompts, & blending chunks
    for entry in parse_curriculum():
        disp = entry["displayWord"]
        focus = entry["focusWord"]
        spoken_disp = clean_pokemon_speech(disp.lower())
        spoken_focus = clean_pokemon_speech(focus.lower())

        jobs[f"word:{disp.lower()}"] = (f"w_{normalize_key(disp)}.mp3", f"{spoken_disp}!")
        if focus.lower() != disp.lower():
            jobs[f"word:{focus.lower()}"] = (f"w_{normalize_key(focus)}.mp3", f"{spoken_focus}!")

        clean_sent = clean_pokemon_speech(entry["sentence"])
        jobs[f"intro:{disp.lower()}"] = (
            f"i_{normalize_key(disp)}.mp3",
            f"Spell {spoken_disp}! {clean_sent}",
        )

        # Collect blending chunks (both successiveChunkCues and cumulative pairs)
        for ch in entry["chunks"]:
            blend_cues.add(ch.lower())
        cum = ""
        for letters, _pkey in entry["units"]:
            cum += letters.lower()
            blend_cues.add(cum)
        for h in entry["hearts"]:
            heart_hints.add(h)

        # Zone 4 Clinic diagnosis prompt
        if entry["zoneId"] == 4:
            target = next(
                (m for m in medicine_items if m["label"].upper() == disp.upper()), None
            )
            if not target and entry["itemSlug"]:
                target = next(
                    (m for m in medicine_items if m["itemSlug"] == entry["itemSlug"]), None
                )
            if not target and entry["statusCondition"]:
                target = next(
                    (m for m in medicine_items if m["statusTag"] == entry["statusCondition"]),
                    None,
                )
            target = target or medicine_items[0]
            status = entry["statusCondition"] or target["statusTag"] or "HP"
            symptom = STATUS_DESCRIPTIONS.get(status, "needs energy and healing")
            poke_spoken = pokemon_spoken_lookup.get(
                entry["pokemonName"].lower(), clean_pokemon_speech(entry["pokemonName"])
            )
            label_spoken = clean_pokemon_speech(target["label"].lower())
            jobs[f"clinic:{entry['id']}"] = (
                f"cl_{normalize_key(entry['id'])}.mp3",
                f"{poke_spoken} {symptom}! Pick {label_spoken} to help!",
            )

    # 2. Extra words from Word Chains & Menu Cards
    chains = parse_word_chains()
    for chain in chains:
        words_list = []
        for idx, step in enumerate(chain["steps"]):
            w = step["word"].lower()
            words_list.append(w)
            if f"word:{w}" not in jobs:
                jobs[f"word:{w}"] = (f"w_{normalize_key(w)}.mp3", f"{clean_pokemon_speech(w)}!")
            cum = ""
            for letters, _pkey in step["units"]:
                cum += letters.lower()
                blend_cues.add(cum)

            # Clean Dojo step prompt (strip weird "sss-uh-nnn" hyphens into natural phrasing!)
            clean_prompt = re.sub(
                r"Slide to blend [a-z-]+!",
                f"Slide to blend {w}!",
                step["spokenPrompt"],
                flags=re.IGNORECASE,
            )
            clean_prompt = re.sub(
                r"Blend [a-z-]+!",
                f"Slide to blend {w}!",
                clean_prompt,
                flags=re.IGNORECASE,
            )
            full_prompt = clean_pokemon_speech(f"{clean_prompt} {step['sentence']}".strip())
            jobs[f"dojo_step:{chain['id']}_{idx}"] = (
                f"ds_{normalize_key(chain['id'])}_{idx}.mp3",
                full_prompt,
            )
            jobs[f"dojo_ok:{chain['id']}_{idx}"] = (
                f"do_{normalize_key(chain['id'])}_{idx}.mp3",
                f"Yes! Now slide to blend {w}!",
            )

        jobs[f"dojo_done:{chain['id']}"] = (
            f"dd_{normalize_key(chain['id'])}.mp3",
            f"Hooray! You finished the word chain: {', '.join(words_list)}!",
        )

    for card in menu_cards:
        for w in [card["label"].lower(), card["focusWord"].lower()]:
            if f"word:{w}" not in jobs:
                jobs[f"word:{w}"] = (f"w_{normalize_key(w)}.mp3", f"{clean_pokemon_speech(w)}!")
        cum = ""
        for letters, _pkey in card["units"]:
            cum += letters.lower()
            blend_cues.add(cum)
        for h in card["hearts"]:
            heart_hints.add(h)

        # Clean up any leftover "mmm"/"sss"/"fff"/"rrr" in menu hints
        hint_clean = (
            card["spokenHint"]
            .replace("the smooth mmm sound", "the M sound")
            .replace("the smooth sss sound", "the S sound")
            .replace("the smooth fff sound", "the F sound")
            .replace("the smooth rrr sound", "the R sound")
            .replace("vvv", "V")
            .replace("zzz", "Z")
            .replace("long eee", "long E")
        )
        jobs[f"menu_prompt:{card['id']}"] = (
            f"mp_{normalize_key(card['id'])}.mp3",
            clean_pokemon_speech(card["prompt"]),
        )
        jobs[f"menu_hint:{card['id']}"] = (
            f"mh_{normalize_key(card['id'])}.mp3",
            clean_pokemon_speech(f"Good try! {hint_clean}"),
        )
        jobs[f"menu_glow:{card['id']}"] = (
            f"mg_{normalize_key(card['id'])}.mp3",
            clean_pokemon_speech(f"Look for the glowing card! {hint_clean}"),
        )
        jobs[f"menu_win:{card['id']}"] = (
            f"mw_{normalize_key(card['id'])}.mp3",
            clean_pokemon_speech(f"Awesome! You found {card['label'].lower()}! Now slide to blend it!"),
        )

    # 3. All 26 A-Z Letters — Clean "M sound" phrasing (NO "Mm" hums!)
    for letter, _pkey, kw in parse_alphabet():
        if letter == "X":
            jobs[f"letter:{letter.lower()}"] = (
                f"l_{letter.lower()}.mp3",
                f"X, like at the end of {kw}!",
            )
            jobs[f"safari:{letter.lower()}"] = (
                f"s_{letter.lower()}.mp3",
                f"Which letter makes the X sound, at the end of {kw}?",
            )
        else:
            jobs[f"letter:{letter.lower()}"] = (
                f"l_{letter.lower()}.mp3",
                f"{letter}, like {kw}!",
            )
            jobs[f"safari:{letter.lower()}"] = (
                f"s_{letter.lower()}.mp3",
                f"Which letter makes the {letter} sound, like {kw}?",
            )

    # 4. All Phonemes (clean natural cues)
    for pkey, spoken in PHONEME_SPOKEN.items():
        jobs[f"phoneme:{pkey}"] = (f"ph_{pkey}.mp3", spoken)

    # 5. All Blending Step Cues (union of phonemes.blendingCue + curriculum + chains + menus)
    blend_cues |= parse_phonemes_blending()
    blend_cues |= set(BLEND_SPOKEN_MAP.keys())
    for cue in sorted(blend_cues):
        clean_cue = cue.strip().lower()
        if not clean_cue:
            continue
        # If it's already an exact curriculum/chain/menu word, reuse the word clip!
        if f"word:{clean_cue}" in jobs:
            jobs[f"blend:{clean_cue}"] = jobs[f"word:{clean_cue}"]
            continue
        spoken_chunk = BLEND_SPOKEN_MAP.get(clean_cue, clean_pokemon_speech(clean_cue))
        jobs[f"blend:{clean_cue}"] = (
            f"bl_{normalize_key(clean_cue)}.mp3",
            spoken_chunk,
        )

    # 6. All Heart-Word Hints
    for hint in sorted(heart_hints):
        clean_h = (
            hint.replace("says sss", "says S")
            .replace("says ay", "says A")
            .replace("says eye", "says I")
            .replace("says oh", "says O")
            .replace("says oo", "says oo")
        )
        jobs[f"heart:{normalize_key(hint)}"] = (
            f"ht_{normalize_key(hint)}.mp3",
            clean_pokemon_speech(clean_h),
        )

    # 7. Badges, Accessories, Partner Moves
    badges, accessories, moves = parse_rewards()
    for bid, bname, bdesc in badges:
        jobs[f"badge:{bid}"] = (
            f"bg_{normalize_key(bid)}.mp3",
            clean_pokemon_speech(f"Hooray! You earned the {bname} Badge! {bdesc}"),
        )
    for aid, aname in accessories:
        jobs[f"acc_on:{aid}"] = (
            f"ao_{normalize_key(aid)}.mp3",
            f"Ee-vee put on the {aname}!",
        )
        jobs[f"acc_off:{aid}"] = (
            f"af_{normalize_key(aid)}.mp3",
            f"Took off the {aname}!",
        )
    for mid, mname, mcallout in moves:
        jobs[f"move:{mid}"] = (
            f"mv_{normalize_key(mid)}.mp3",
            clean_pokemon_speech(mcallout),
        )
        jobs[f"move_ready:{mid}"] = (
            f"mr_{normalize_key(mid)}.mp3",
            f"Ee-vee is ready to use {mname}!",
        )

    # 8. All 10 Overworld Landmarks
    for lid, lname in parse_landmarks():
        spoken_name = clean_pokemon_speech(lname).replace("–", " to ")
        jobs[f"town:{lid}"] = (f"tn_{normalize_key(lid)}.mp3", f"{spoken_name}!")
        jobs[f"town_locked:{lid}"] = (
            f"tl_{normalize_key(lid)}.mp3",
            f"{spoken_name} is next! Finish the glowing town first!",
        )

    # 9. Core UI & Encouragement Phrases
    ui_phrases = {
        "welcome": "Let's go! Spell with Ee-vee!",
        "great_job": "Awesome job! Now slide Ee-vee's paw to blend the sounds!",
        "first_try": "Woohoo! You spelled it on your first try! Now slide to blend!",
        "teamwork": "Great teamwork! Ee-vee placed that letter for you!",
        "throw_ball": "Awesome blend! Tap the Pokay Ball to catch your new friend!",
        "heal_now": "Smooth blend! Tap Heal to help your Pokay-mon feel all better!",
        "launch_move": "Smooth blend! Tap your move to shine in battle!",
        "stage_win": "Hooray! You finished the whole stage! Ee-vee is so proud of you!",
        "try_again": "Good try! Listen closely and try another letter!",
        "glow_hint": "Take your time! Look for the glowing letter!",
        "all_better": "All better! Your Pokay-mon feels healthy and happy again!",
        "test_voice": "Hi friend! Let's blend the sounds in sun. S, suh, sun!",
    }
    for ukey, text in ui_phrases.items():
        jobs[f"ui:{ukey}"] = (f"u_{ukey}.mp3", text)

    return jobs


async def synth_one(sem, filename: str, text: str):
    out_path = OUT_DIR / filename
    if out_path.exists() and out_path.stat().st_size > 600:
        return
    async with sem:
        for attempt in range(4):
            try:
                comm = edge_tts.Communicate(text, VOICE, rate=RATE)
                await comm.save(str(out_path))
                return
            except Exception:
                if attempt == 3:
                    raise
                await asyncio.sleep(0.6 * (attempt + 1))


async def main():
    jobs = build_jobs()
    # Deduplicate by filename so shared clips are synthesized once
    unique_files = {}
    for fname, text in jobs.values():
        unique_files.setdefault(fname, text)

    # Prune only stale clips not in the current manifest
    for old_mp3 in OUT_DIR.glob("*.mp3"):
        if old_mp3.name not in unique_files:
            old_mp3.unlink()

    print(f"Synthesizing {len(unique_files)} unique {VOICE} clips ({len(jobs)} manifest keys)...")
    sem = asyncio.Semaphore(14)
    tasks = [synth_one(sem, fname, text) for fname, text in unique_files.items()]
    await asyncio.gather(*tasks)

    manifest = {key: fname for key, (fname, _) in jobs.items()}
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    total_bytes = sum(p.stat().st_size for p in OUT_DIR.glob("*.mp3"))
    print(
        f"Done! Generated {len(unique_files)} unique {VOICE} MP3s "
        f"({len(manifest)} manifest keys, {total_bytes / (1024*1024):.2f} MB) in {OUT_DIR}"
    )


if __name__ == "__main__":
    asyncio.run(main())
