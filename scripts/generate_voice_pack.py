#!/usr/bin/env python3
"""
Generates a compact, studio-quality neural human voice pack (en-US-JennyNeural)
for Let's Go, Spell with Eevee! stored in public/assets/audio/ + manifest.json.
"""
import asyncio
import json
import os
import re
from pathlib import Path
import edge_tts

VOICE = "en-US-JennyNeural"
RATE = "-6%"
ROOT = Path("/home/antigravity/craiz99/spelling-game")
OUT_DIR = ROOT / "public" / "assets" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_key(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return cleaned[:90]


def parse_curriculum():
    src = (ROOT / "src" / "data" / "curriculum.ts").read_text(encoding="utf-8")
    entries = []
    # Match each word object block
    blocks = re.split(r"\n  \{", src)
    for b in blocks[1:]:
        id_m = re.search(r"id:\s*'([^']+)'", b)
        disp_m = re.search(r"displayWord:\s*'([^']+)'", b)
        focus_m = re.search(r"focusWord:\s*'([^']+)'", b)
        sent_m = re.search(r"everydaySentence:\s*'((?:\\'|[^'])+)'", b)
        if id_m and disp_m and focus_m:
            sent = sent_m.group(1).replace("\\'", "'") if sent_m else ""
            entries.append((id_m.group(1), disp_m.group(1), focus_m.group(1), sent))
    return entries


def parse_pokemon():
    src = (ROOT / "src" / "data" / "pokemonCatalog.ts").read_text(encoding="utf-8")
    pokes = []
    for m in re.finditer(r"id:\s*(\d+),\s*name:\s*['\"]([^'\"]+)['\"],\s*spokenName:\s*'([^']+)'", src):
        pokes.append((int(m.group(1)), m.group(2), m.group(3)))
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


# Carefully tuned human-spoken pure phonics cues for neural TTS
PHONEME_SPOKEN = {
    "a_short": "ah, as in apple",
    "e_short": "eh, as in egg",
    "i_short": "ih, as in in",
    "o_short": "ah, as in on",
    "u_short": "uh, as in up",
    "a_long": "ay",
    "e_long": "ee",
    "i_long": "eye",
    "o_long": "oh",
    "u_long": "oo",
    "b": "buh, like ball",
    "c": "kuh, like cat",
    "d": "duh, like dog",
    "f": "fff, like fish",
    "g": "guh, like go",
    "h": "huh, like hat",
    "j": "juh, like jump",
    "k": "kuh, like kite",
    "l": "lll, like lion",
    "m": "mmm, like map",
    "n": "nnn, like net",
    "p": "puh, like pig",
    "qu": "kwuh, like queen",
    "r": "rrr, like run",
    "s": "sss, like sun",
    "t": "tuh, like top",
    "v": "vvv, like van",
    "w": "wuh, like whale",
    "x": "ks, like box",
    "y_cons": "yuh, like yes",
    "z": "zzz, like zebra",
    "sh": "shh, like shop",
    "ch": "chuh, like chat",
    "th": "thh, like thin",
    "th_voiced": "thh, like the",
    "wh": "wuh, like whip",
    "ck": "kuh, like duck",
    "ea": "ee, like heal",
    "ee": "ee, like see",
    "ay": "ay, like play",
    "ai": "ay, like tail",
    "ar": "ar, like star",
    "ur": "er, like burn",
    "oo_short": "oo, like good",
    "ow_long": "oh, like grow",
    "ll": "lll, like ball",
    "ff": "fff, like puff",
    "ce": "sss, like ice",
    "schwa": "uh",
    "y_vowel": "ee, like candy",
    "ie_short": "eh, like friend",
    "uy": "eye, like buy",
    "a_aw": "aw, like ball",
}


def build_jobs():
    jobs = {}  # key -> (filename, spoken_text)

    # 1. Curriculum words + spoken introductions
    for word_id, display_word, focus_word, sentence in parse_curriculum():
        w_key = f"word:{display_word.lower()}"
        w_file = f"w_{normalize_key(display_word)}.mp3"
        spoken_w = display_word.lower().replace("eevee", "Ee-vee").replace("psyduck", "Sigh-duck").replace("seel", "seal")
        jobs[w_key] = (w_file, f"{spoken_w}!")

        if focus_word.lower() != display_word.lower():
            f_key = f"word:{focus_word.lower()}"
            f_file = f"w_{normalize_key(focus_word)}.mp3"
            jobs[f_key] = (f_file, f"{focus_word.lower()}!")

        intro_key = f"intro:{display_word.lower()}"
        intro_file = f"i_{normalize_key(display_word)}.mp3"
        clean_sent = sentence.replace("EEVEE", "Ee-vee").replace("Eevee", "Ee-vee").replace("PSYDUCK", "Sigh-duck").replace("SEEL", "seal")
        jobs[intro_key] = (intro_file, f"Spell {spoken_w}! {clean_sent}")

    # 2. Extra word-chain / everyday words
    for extra in ["cat", "mat", "sat", "set", "met", "mug", "mop", "pit", "fit", "hit", "bit", "duck", "puff", "bulb", "wake", "ant", "ice", "burn", "full", "cure"]:
        k = f"word:{extra}"
        if k not in jobs:
            jobs[k] = (f"w_{extra}.mp3", f"{extra}!")

    # 3. All 56 Kanto Pokémon names with accurate pronunciation
    for pid, name, spoken_name in parse_pokemon():
        jobs[f"pokemon:{name.lower()}"] = (f"p_{pid}.mp3", f"{spoken_name}!")
        jobs[f"caught:{name.lower()}"] = (f"c_{pid}.mp3", f"Gotcha! {spoken_name} joined your team!")

    # 4. All 26 A-Z Letters (Explore + Safari Catch Prompts)
    for letter, pkey, kw in parse_alphabet():
        cue = PHONEME_SPOKEN.get(pkey, pkey)
        if letter == "X":
            jobs[f"letter:{letter.lower()}"] = (
                f"l_{letter.lower()}.mp3",
                f"{letter} says ks, like at the end of {kw}!",
            )
            jobs[f"safari:{letter.lower()}"] = (
                f"s_{letter.lower()}.mp3",
                f"Which letter makes the ks sound at the end of {kw}?",
            )
        else:
            sound_only = cue.split(",")[0]
            jobs[f"letter:{letter.lower()}"] = (
                f"l_{letter.lower()}.mp3",
                f"{letter} says {sound_only}, like {kw}!",
            )
            jobs[f"safari:{letter.lower()}"] = (
                f"s_{letter.lower()}.mp3",
                f"Which letter makes the {sound_only} sound, like {kw}?",
            )

    # 5. Pure phoneme sounds
    for pkey, spoken in PHONEME_SPOKEN.items():
        jobs[f"phoneme:{pkey}"] = (f"ph_{pkey}.mp3", spoken)

    # 6. Core UI & Encouragement phrases
    ui_phrases = {
        "welcome": "Let's go! Spell with Ee-vee!",
        "great_job": "Awesome job! Now slide Ee-vee's paw to blend the sounds!",
        "first_try": "Woohoo! You spelled it on your first try! Now slide to blend!",
        "teamwork": "Great teamwork! Ee-vee placed that letter for you!",
        "throw_ball": "Awesome blend! Tap the Poké Ball to catch your new friend!",
        "heal_now": "Smooth blend! Tap Heal to help your Pokémon feel all better!",
        "launch_move": "Smooth blend! Tap your move to shine in battle!",
        "stage_win": "Hooray! You finished the whole stage! Ee-vee is so proud of you!",
        "try_again": "Good try! Listen closely and try another letter!",
        "glow_hint": "Take your time! Look for the glowing letter!",
        "all_better": "All better! Your Pokémon feels healthy and happy again!",
        "test_voice": "Hi friend! Let's blend the sounds in sun. sss, suh, sun!",
    }
    for ukey, text in ui_phrases.items():
        jobs[f"ui:{ukey}"] = (f"u_{ukey}.mp3", text)

    return jobs


async def synth_one(sem, filename: str, text: str):
    out_path = OUT_DIR / filename
    if out_path.exists() and out_path.stat().st_size > 1000:
        return
    async with sem:
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(text, VOICE, rate=RATE)
                await comm.save(str(out_path))
                return
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(0.5 * (attempt + 1))


async def main():
    jobs = build_jobs()
    sem = asyncio.Semaphore(10)
    tasks = [synth_one(sem, fname, text) for fname, text in jobs.values()]
    await asyncio.gather(*tasks)

    manifest = {key: fname for key, (fname, _) in jobs.items()}
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    total_bytes = sum(p.stat().st_size for p in OUT_DIR.glob("*.mp3"))
    print(f"Generated {len(manifest)} neural voice clips ({total_bytes / (1024*1024):.2f} MB) in {OUT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
