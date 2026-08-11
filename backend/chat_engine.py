"""
backend/chat_engine.py
-----------------------
Enhanced Conversational CineBot AI Engine for CineSense.

Features:
1. Gibberish & Nonsense Detection with friendly conversational recovery.
2. "How is [Movie]?" & Review/Verdict Intent recognition with detailed critical appraisals.
3. Natural Language Recommendation Intent (e.g. "like Inception but shorter").
4. Hybrid RecSys integration for structured recommendations.
"""

import re
import difflib
from typing import Dict, Any, List, Optional

# Curated reviews and metadata for top cinematic masterpieces
MOVIE_REVIEWS = {
    "3 idiots": {
        "title": "3 Idiots (2009)",
        "verdict": "Must-Watch Masterpiece (⭐ 9.8 / 10)",
        "runtime_mins": 170,
        "genres": "Comedy|Drama|Romance",
        "avg_rating": 4.5,
        "imdb_rating": 8.4,
        "review": (
            "**3 Idiots (2009)** is universally hailed as one of the greatest, most heartwarming comedy-dramas in cinema history.\n\n"
            "Directed by Rajkumar Hirani and starring Aamir Khan, R. Madhavan, and Sharman Joshi, the film brilliantly satirizes the crushing pressure of the competitive academic system while delivering an unforgettable message: *'Pursue excellence, and success will follow you.'*\n\n"
            "**Why you'll love it**:\n"
            "• **Pure Emotion & Humor**: Flawlessly balances side-splitting comedy with genuine, tearjerking moments.\n"
            "• **Timeless Message**: Inspires viewers of all ages to follow their authentic passion rather than rat-race conformity.\n"
            "• **Iconic Characters**: From Rancho's rebellious brilliance to Virus and Chatur (*Silencer*), every scene is legendary.\n\n"
            "**Final Verdict**: A 10/10 essential watch that will make you laugh, cry, and call your best friends immediately!"
        ),
        "similar": ["chichhore", "panchayat", "taare zameen par"]
    },
    "inception": {
        "title": "Inception (2010)",
        "verdict": "Mind-Bending Cinematic Triumph (⭐ 9.7 / 10)",
        "runtime_mins": 148,
        "genres": "Action|Crime|Drama|Mystery|Sci-Fi|Thriller",
        "avg_rating": 4.5,
        "imdb_rating": 8.8,
        "review": (
            "**Inception (2010)** is Christopher Nolan's magnum opus of high-concept original science fiction.\n\n"
            "Starring Leonardo DiCaprio as a master thief who steals secrets from deep within the subconscious dream state, the film follows a perilous mission to perform 'inception' — planting an original idea across three nested dream levels.\n\n"
            "**Why you'll love it**:\n"
            "• **Spectacular Visual Craft**: Practical rotating hallway fights, folding Paris streets, and jaw-dropping zero-gravity action.\n"
            "• **Hans Zimmer's Score**: The thunderous brass score (*Time*) elevates the emotional stakes to astronomical heights.\n"
            "• **Endlessly Rewatchable**: The famous spinning top finale will have you debating reality long after the credits roll.\n\n"
            "**Final Verdict**: An unmissable modern classic for anyone who loves puzzle plots and psychological thrillers."
        ),
        "similar": ["memento", "source code", "shutter island", "edge of tomorrow"]
    },
    "interstellar": {
        "title": "Interstellar (2014)",
        "verdict": "Epic Cosmic & Emotional Voyage (⭐ 9.6 / 10)",
        "runtime_mins": 169,
        "genres": "Sci-Fi|Adventure|Drama",
        "avg_rating": 4.5,
        "imdb_rating": 8.7,
        "review": (
            "**Interstellar (2014)** is an astonishing synthesis of cutting-edge astrophysics and raw father-daughter emotional heartbreak.\n\n"
            "As Earth faces agricultural collapse, ex-NASA pilot Cooper (Matthew McConaughey) undertakes a desperate voyage through a wormhole near Saturn to find humanity a habitable new home across the stars.\n\n"
            "**Why you'll love it**:\n"
            "• **Scientific Grandeur**: Realistic visualization of the black hole *Gargantua*, gravitational time dilation, and relativistic physics.\n"
            "• **Emotional Depth**: The core theme — *love is the one thing that transcends dimensions of time and space* — hits with immense power.\n"
            "• **Organ Soundtrack**: Hans Zimmer's pipe organ score creates an unforgettable, spiritual sense of cosmic wonder.\n\n"
            "**Final Verdict**: A monumental sci-fi experience that demands your complete attention."
        ),
        "similar": ["arrival", "gravity", "inception", "dark"]
    },
    "the dark knight": {
        "title": "The Dark Knight (2008)",
        "verdict": "The Gold Standard of Superhero Cinema (⭐ 9.9 / 10)",
        "runtime_mins": 152,
        "genres": "Action|Crime|Drama|Thriller",
        "avg_rating": 4.6,
        "imdb_rating": 9.0,
        "review": (
            "**The Dark Knight (2008)** transcends the comic book genre to stand as an extraordinary crime epic and philosophical masterpiece.\n\n"
            "Featuring Heath Ledger's Oscar-winning, mesmerizing performance as the Joker, the film pushes Batman and Gotham City to their moral breaking points in a chaotic struggle between order and pure anarchy.\n\n"
            "**Why you'll love it**:\n"
            "• **Heath Ledger's Joker**: One of the most magnetic, chilling, and iconic acting performances in film history.\n"
            "• **Moral Complexity**: Tackles surveillance, sacrifice, and the razor-thin line between hero and villain.\n"
            "• **Relentless Pacing**: 2.5 hours that fly by with tension, stunning IMAX sequences, and zero wasted frames.\n\n"
            "**Final Verdict**: An undisputed masterpiece that redefined modern cinema."
        ),
        "similar": ["heat", "se7en", "fight club", "prisoners"]
    },
    "breaking bad": {
        "title": "Breaking Bad (2008)",
        "verdict": "The Greatest TV Drama Ever Made (⭐ 9.9 / 10)",
        "runtime_mins": 47,
        "genres": "Crime|Drama|Thriller",
        "avg_rating": 4.8,
        "imdb_rating": 9.5,
        "review": (
            "**Breaking Bad (2008–2013)** is widely considered the single greatest television drama ever broadcast.\n\n"
            "Created by Vince Gilligan, it chronicles the descent of Walter White (Bryan Cranston), a mild-mannered high school chemistry teacher diagnosed with terminal lung cancer, into the ruthless meth kingpin *Heisenberg*.\n\n"
            "**Why you'll love it**:\n"
            "• **Unmatched Character Transformation**: Mr. Chips genuinely turns into Scarface over 5 breathtaking seasons.\n"
            "• **Masterful Suspense**: Every cliffhanger and cat-and-mouse confrontation is crafted with surgical precision.\n"
            "• **Bryan Cranston & Aaron Paul**: An iconic acting partnership filled with explosive emotion, tragedy, and brotherhood.\n\n"
            "**Final Verdict**: Absolute perfection. A binge-watch requirement for every screen lover."
        ),
        "similar": ["better call saul", "narcos", "mirzapur", "peaky blinders"]
    },
    "panchayat": {
        "title": "Panchayat (2020)",
        "verdict": "Heartwarming & Wholesome Comedy Gem (⭐ 9.4 / 10)",
        "runtime_mins": 35,
        "genres": "Comedy|Drama",
        "avg_rating": 4.7,
        "imdb_rating": 8.9,
        "review": (
            "**Panchayat (2020)** is a breath of fresh air in the Indian web series landscape, trading guns and violence for authentic rural warmth, gentle humor, and deep human relatability.\n\n"
            "Starring Jitendra Kumar (*Abhishek Tripathi*), it follows an engineering graduate who reluctantly takes a low-salary job as a Panchayat secretary in the remote village of Phulera, Uttar Pradesh.\n\n"
            "**Why you'll love it**:\n"
            "• **Pure, Innocent Humor**: Finds delightful comedy in small everyday village problems (solar lights, office chairs, road names).\n"
            "• **Stellar Ensemble Cast**: Raghubir Yadav, Neena Gupta, Chandan Roy (*Vikas*), and Faisal Malik (*Prahlad*) deliver pure magic.\n"
            "• **Comfort Binge**: The coziest, most wholesome show to watch after a stressful day.\n\n"
            "**Final Verdict**: 100% recommended. A sweet, heartwarming masterpiece."
        ),
        "similar": ["gullak", "3 idiots", "chichhore", "ye meri family"]
    },
    "mirzapur": {
        "title": "Mirzapur (2018)",
        "verdict": "Explosive High-Stakes Crime Saga (⭐ 9.1 / 10)",
        "runtime_mins": 50,
        "genres": "Action|Crime|Drama|Thriller",
        "avg_rating": 4.5,
        "imdb_rating": 8.5,
        "review": (
            "**Mirzapur (2018)** is a gritty, high-octane crime thriller set in the lawless heartland of Uttar Pradesh.\n\n"
            "Ruled by the ruthless carpet kingpin Akhandanand Tripathi (*Kaleen Bhaiya*), the show explodes when two upright brothers, Guddu and Bablu Pandit, get entangled in the violent mafia underworld.\n\n"
            "**Why you'll love it**:\n"
            "• **Pankaj Tripathi's Masterclass**: Calm, calculating, and iconic as Kaleen Bhaiya.\n"
            "• **Raw Thrills & Memorable Dialogues**: Packed with razor-sharp one-liners, shocking twists, and adrenaline-pumping rivalries.\n"
            "• **Intense Family Politics**: Deep power struggles where every alliance is fragile.\n\n"
            "**Final Verdict**: A thrilling, edge-of-your-seat crime spectacle for fans of gritty action."
        ),
        "similar": ["sacred games", "gangs of wasseypur", "breaking bad", "narcos"]
    },
    "shutter island": {
        "title": "Shutter Island (2010)",
        "verdict": "Chilling Psychological Puzzle (⭐ 9.2 / 10)",
        "runtime_mins": 138,
        "genres": "Mystery|Thriller",
        "avg_rating": 4.4,
        "imdb_rating": 8.2,
        "review": (
            "**Shutter Island (2010)** is Martin Scorsese's dark, gothic psychological thriller starring Leonardo DiCaprio as U.S. Marshal Teddy Daniels.\n\n"
            "Investigating the mysterious disappearance of a patient from an isolated island asylum for the criminally insane, Teddy is plunged into a web of paranoia, hallucinations, and dark secrets.\n\n"
            "**Why you'll love it**:\n"
            "• **Atmospheric Dread**: Torrential rain, eerie classical music, and claustrophobic asylum corridors.\n"
            "• **Unforgettable Twist**: A legendary plot revelation that completely reframes every scene on a rewatch.\n"
            "• **DiCaprio's Raw Emotion**: A heartbreaking, intense portrayal of grief and trauma.\n\n"
            "**Final Verdict**: A top-tier psychological mystery that will leave your jaw on the floor."
        ),
        "similar": ["memento", "se7en", "prisoners", "inception"]
    },
    "stranger things": {
        "title": "Stranger Things (2016)",
        "verdict": "Phenomenal 80s Nostalgia & Sci-Fi Thrill (⭐ 9.5 / 10)",
        "runtime_mins": 55,
        "genres": "Drama|Fantasy|Horror|Mystery|Sci-Fi",
        "avg_rating": 4.5,
        "imdb_rating": 8.7,
        "review": (
            "**Stranger Things (2016)** is a global pop-culture phenomenon that combines Steven Spielberg-style 1980s nostalgia with Stephen King supernatural dread.\n\n"
            "When a young boy vanishes in Hawkins, Indiana, his friends uncover a bizarre government laboratory experiment, a telekinetic girl named Eleven, and a terrifying alternate dimension known as the *Upside Down*.\n\n"
            "**Why you'll love it**:\n"
            "• **Unbeatable 80s Vibe**: Synthwave soundtrack, Dungeons & Dragons, walkie-talkies, and retro aesthetic.\n"
            "• **Endearing Friendship**: The bond between Mike, Dustin, Lucas, Will, and Eleven carries enormous heart.\n"
            "• **Spectacular Monsters**: The Demogorgon, Mind Flayer, and Vecna provide genuine supernatural horror.\n\n"
            "**Final Verdict**: A must-watch masterclass in suspense and nostalgia for all ages."
        ),
        "similar": ["dark", "the last of us", "stranger things", "chernobyl"]
    }
}

# Catalog lookup for quick recommendations
CURATED_MOVIE_METADATA = {
    "source code": {
        "title": "Source Code (2011)",
        "runtime_mins": 93,
        "genres": "Action|Mystery|Sci-Fi|Thriller",
        "avg_rating": 4.2,
        "imdb_rating": 7.5,
        "why": "A rapid-fire 93-minute quantum loop thriller with high stakes and zero filler."
    },
    "memento": {
        "title": "Memento (2000)",
        "runtime_mins": 113,
        "genres": "Mystery|Thriller",
        "avg_rating": 4.4,
        "imdb_rating": 8.4,
        "why": "Christopher Nolan's reverse-chronological memory puzzle that keeps you on the edge of your seat."
    },
    "edge of tomorrow": {
        "title": "Edge of Tomorrow (2014)",
        "runtime_mins": 113,
        "genres": "Action|Adventure|Sci-Fi",
        "avg_rating": 4.3,
        "imdb_rating": 7.9,
        "why": "High-octane sci-fi time loop action that delivers mind-bending fun in under 2 hours."
    },
    "arrival": {
        "title": "Arrival (2016)",
        "runtime_mins": 116,
        "genres": "Drama|Mystery|Sci-Fi",
        "avg_rating": 4.4,
        "imdb_rating": 7.9,
        "why": "A deeply poetic and profound first-contact sci-fi with a breathtaking narrative twist."
    },
    "gravity": {
        "title": "Gravity (2013)",
        "runtime_mins": 91,
        "genres": "Drama|Sci-Fi|Thriller",
        "avg_rating": 4.1,
        "imdb_rating": 7.7,
        "why": "A heart-pounding 91-minute space survival ride with astonishing visual craft."
    },
    "chichhore": {
        "title": "Chhichhore (2019)",
        "runtime_mins": 143,
        "genres": "Comedy|Drama",
        "avg_rating": 4.4,
        "imdb_rating": 8.3,
        "why": "A nostalgic hostel friendship journey celebrating life, laughter, and triumph over failure."
    },
    "taare zameen par": {
        "title": "Like Stars on Earth (Taare Zameen Par) (2007)",
        "runtime_mins": 165,
        "genres": "Drama",
        "avg_rating": 4.5,
        "imdb_rating": 8.4,
        "why": "A heartwarming, emotional story of childhood imagination, empathy, and mentorship."
    },
    "dark": {
        "title": "Dark (2017)",
        "runtime_mins": 55,
        "genres": "Crime|Drama|Mystery|Sci-Fi|Thriller",
        "avg_rating": 4.6,
        "imdb_rating": 8.7,
        "why": "A labyrinthine, generational time travel mystery where past, present, and future collide seamlessly."
    },
    "se7en": {
        "title": "Se7en (1995)",
        "runtime_mins": 127,
        "genres": "Crime|Drama|Mystery|Thriller",
        "avg_rating": 4.5,
        "imdb_rating": 8.6,
        "why": "A masterclass in atmospheric detective noir tracking seven deadly sins toward a shocking climax."
    },
    "prisoners": {
        "title": "Prisoners (2013)",
        "runtime_mins": 153,
        "genres": "Crime|Drama|Mystery|Thriller",
        "avg_rating": 4.4,
        "imdb_rating": 8.1,
        "why": "An agonizing, pulse-pounding mystery with stellar performances from Hugh Jackman and Jake Gyllenhaal."
    }
}


# Common movie and conversational keywords
RECOGNIZED_KEYWORDS = {
    "movie", "movies", "film", "films", "cinema", "show", "shows", "series", "web",
    "watch", "watching", "like", "similar", "good", "best", "better", "recommend", "recommendation",
    "recommendations", "how", "what", "is", "about", "tell", "me", "find", "give", "suggest",
    "suggestions", "action", "comedy", "drama", "scifi", "sci-fi", "thriller", "romance",
    "romantic", "horror", "mystery", "crime", "dark", "gritty", "shorter", "short", "long",
    "epic", "funny", "twist", "plot", "space", "star", "fast", "paced", "story", "director",
    "actor", "review", "reviews", "verdict", "worth", "top", "rated", "great", "nice",
    "hello", "hi", "hey", "help", "please", "fav", "favorite", "favorites", "imdb", "rating",
    "ratings", "indian", "bollywood", "hollywood", "anime", "family", "comfort", "wholesome"
}


def is_gibberish(text: str) -> bool:
    """
    Robust detection for random keystrokes, consonant mash, and meaningless tokens.
    e.g. 'asdjflksa', 'asdfghjkl', 'qwerty', 'zzzzz', '123456789', '!@#$%'
    """
    if not text or not text.strip():
        return True

    lower = text.lower().strip()
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", lower)
    
    # 1. Very short or symbol-only strings
    if len(cleaned) < 2:
        return True

    # 2. Check for known movie titles in the prompt first
    all_titles = list(MOVIE_REVIEWS.keys()) + list(CURATED_MOVIE_METADATA.keys())
    for t in all_titles:
        if t in lower:
            return False

    # 3. Check for recognized vocabulary tokens
    words = re.findall(r"[a-z]+", lower)
    has_recognized_word = any(w in RECOGNIZED_KEYWORDS for w in words)
    if has_recognized_word:
        return False

    # 4. Check for 4+ consecutive consonants (e.g. 'sdjflks', 'ghjkl', 'qwrtps')
    consonant_cluster = re.search(r"[bcdfghjklmnpqrstvwxyz]{4,}", cleaned)
    if consonant_cluster:
        # Check if it's not a common English sub-word like 'night' or 'length'
        matched = consonant_cluster.group(0)
        if matched not in ["ngth", "ghts", "rthm", "schm"]:
            return True

    # 5. Keyboard home-row or single-row smash (e.g. 'asdjflksa', 'qwertyui', 'zxcvbnm')
    home_row = set("asdfghjkl")
    top_row = set("qwertyuiop")
    bot_row = set("zxcvbnm")
    
    if len(cleaned) >= 5:
        home_ratio = sum(1 for c in cleaned if c in home_row) / len(cleaned)
        top_ratio = sum(1 for c in cleaned if c in top_row) / len(cleaned)
        bot_ratio = sum(1 for c in cleaned if c in bot_row) / len(cleaned)
        if home_ratio >= 0.75 or top_ratio >= 0.85 or bot_ratio >= 0.85:
            return True

    # 6. Repetitive characters (e.g. 'aaaaa', 'hahaha', '1111')
    if len(set(cleaned)) <= 2 and len(cleaned) >= 4:
        return True

    # 7. Low vowel count
    alpha_chars = [c for c in cleaned if c.isalpha()]
    if len(alpha_chars) >= 4:
        vowels = set("aeiou")
        vowel_count = sum(1 for c in alpha_chars if c in vowels)
        ratio = vowel_count / len(alpha_chars)
        if ratio < 0.15 or vowel_count == 0:
            return True

    # If single arbitrary word and not recognized, treat as unclassifiable gibberish
    if len(words) == 1 and len(words[0]) >= 5 and words[0] not in RECOGNIZED_KEYWORDS:
        return True

    return False



class CineBotEngine:
    """
    Conversational AI Assistant that understands review queries ("How is 3 Idiots?"),
    runtime constraints, mood parameters, and handles gibberish cleanly.
    """

    @staticmethod
    def parse_user_prompt(text: str) -> Dict[str, Any]:
        """Extracts intent, reference movies, and query category."""
        lower = text.lower().strip()

        # 1. Review & Opinion Intent ("How is...", "Is it good?", "Tell me about...", "Review of...")
        review_patterns = [
            "how is", "how's", "how was", "is it good", "is this good", "is this movie good",
            "is it worth", "is it worth watching", "tell me about", "what is it about",
            "what is", "review of", "should i watch", "opinion on", "is good", "verdict on"
        ]
        is_review = any(p in lower for p in review_patterns)

        # 2. Constraints & Modifiers
        is_shorter = any(w in lower for w in ["shorter", "short", "quick", "under 2 hours", "under 100 mins", "fast", "fast-paced", "quick bite"])
        is_longer = any(w in lower for w in ["epic", "long", "marathon", "deep dive", "3 hours"])
        is_dark = any(w in lower for w in ["dark", "gritty", "scary", "disturbing", "noir", "intense", "creepy"])
        is_feelgood = any(w in lower for w in ["feel good", "feel-good", "funny", "comedy", "light", "heartwarming", "family", "comfort", "wholesome", "sweet"])
        is_mindbending = any(w in lower for w in ["mind bending", "mind-bending", "twist", "plot twist", "brain", "puzzle", "confusing", "quantum", "time loop"])
        is_space = any(w in lower for w in ["space", "interstellar", "galaxy", "wormhole", "alien", "astronaut", "mars", "cosmos"])
        is_crime = any(w in lower for w in ["crime", "gangster", "mafia", "detective", "police", "murder", "investigation", "heist"])
        is_series = any(w in lower for w in ["series", "show", "web series", "seasons", "tv show", "episodes"])

        # 3. Identify referenced movie name
        reference_movie = None
        all_known = list(MOVIE_REVIEWS.keys()) + list(CURATED_MOVIE_METADATA.keys())
        for key in all_known:
            if key in lower:
                reference_movie = key
                break

        return {
            "query": text,
            "is_review": is_review,
            "reference_movie": reference_movie,
            "is_shorter": is_shorter,
            "is_longer": is_longer,
            "is_dark": is_dark,
            "is_feelgood": is_feelgood,
            "is_mindbending": is_mindbending,
            "is_space": is_space,
            "is_crime": is_crime,
            "is_series": is_series
        }

    @classmethod
    def generate_recommendation_response(cls, user_message: str) -> Dict[str, Any]:
        """Generates contextual conversational response and structured movie cards."""
        # 1. Check for Gibberish / Meaningless Noise
        if is_gibberish(user_message):
            return {
                "query": user_message,
                "reply": (
                    "I didn't quite catch that! 😊 You can ask me natural questions like:\n\n"
                    "• *'How is 3 Idiots?'*\n"
                    "• *'Movies like Inception but shorter'*\n"
                    "• *'A dark space thriller with a crazy twist'*\n"
                    "• *'Top-rated feel-good comedies for family night'*\n\n"
                    "What kind of movie or mood are you looking for?"
                ),
                "intent": {"is_gibberish": True},
                "recommendations": []
            }

        intent = cls.parse_user_prompt(user_message)
        ref = intent["reference_movie"]

        # 2. Check for "How is [Movie]?" Review & Verdict Intent
        if intent["is_review"] and ref and ref in MOVIE_REVIEWS:
            rev_data = MOVIE_REVIEWS[ref]
            reply = rev_data["review"]
            
            # Primary card is the movie itself + 2-3 similar recommendations
            recs = [
                {
                    "rank": 1,
                    "title": rev_data["title"],
                    "genres": rev_data["genres"],
                    "runtime": f"{rev_data['runtime_mins']} mins",
                    "avg_rating": rev_data["avg_rating"],
                    "imdb_rating": rev_data["imdb_rating"],
                    "why": rev_data["verdict"]
                }
            ]

            # Add similar suggestions below
            for sim_key in rev_data.get("similar", [])[:2]:
                if sim_key in CURATED_MOVIE_METADATA:
                    m = CURATED_MOVIE_METADATA[sim_key]
                    recs.append({
                        "rank": len(recs) + 1,
                        "title": m["title"],
                        "genres": m["genres"],
                        "runtime": f"{m.get('runtime_mins', 110)} mins",
                        "avg_rating": m.get("avg_rating", 4.3),
                        "imdb_rating": m.get("imdb_rating", 8.2),
                        "why": m.get("why", "Highly rated companion watch.")
                    })
                elif sim_key in MOVIE_REVIEWS:
                    m = MOVIE_REVIEWS[sim_key]
                    recs.append({
                        "rank": len(recs) + 1,
                        "title": m["title"],
                        "genres": m["genres"],
                        "runtime": f"{m.get('runtime_mins', 110)} mins",
                        "avg_rating": m.get("avg_rating", 4.3),
                        "imdb_rating": m.get("imdb_rating", 8.2),
                        "why": m.get("verdict", "Highly rated companion watch.")
                    })

            return {
                "query": user_message,
                "reply": reply,
                "intent": intent,
                "recommendations": recs
            }

        # 3. Recommendation Queries (e.g. "like Inception but shorter")
        recommendations = []
        reply = ""

        # Case: "Inception but shorter"
        if ref == "inception" and (intent["is_shorter"] or intent["is_mindbending"]):
            reply = "If you loved the multi-layered reality of Inception but want something punchier and faster-paced, here are 3 thrilling mind-benders with shorter runtimes and non-stop momentum:"
            candidates = ["source code", "memento", "edge of tomorrow"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])

        # Case: General "like Inception"
        elif ref == "inception":
            reply = "Here are premier mind-bending puzzle thrillers featuring high-concept heists, reality shifts, and staggering plot twists:"
            candidates = ["shutter island", "memento", "source code", "edge of tomorrow"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])
                elif c in MOVIE_REVIEWS:
                    recommendations.append(MOVIE_REVIEWS[c])

        # Case: "Interstellar" / Space Thrillers
        elif ref == "interstellar" or intent["is_space"]:
            if intent["is_shorter"]:
                reply = "Looking for a cosmic space journey without a 3-hour commitment? Here are breathtaking space adventures with intense pacing:"
                candidates = ["gravity", "arrival"]
            else:
                reply = "Here are awe-inspiring sci-fi epics that explore the frontiers of human emotion, cosmic survival, and reality:"
                candidates = ["arrival", "gravity", "dark"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])

        # Case: "3 Idiots" / Feel-good College Comedies
        elif ref in ["3 idiots", "panchayat", "dilwale dulhania le jayenge"] or intent["is_feelgood"]:
            reply = "Looking for uplifting laughter and heartwarming friendship? Here are universally beloved feel-good classics:"
            candidates = ["chichhore", "taare zameen par", "panchayat"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])
                elif c in MOVIE_REVIEWS:
                    recommendations.append(MOVIE_REVIEWS[c])

        # Case: Dark Crime Thrillers / Detective Mysteries
        elif intent["is_crime"] or intent["is_dark"]:
            if intent["is_series"]:
                reply = "For gritty crime sagas packed with power struggles and tension, dive into these acclaimed masterpieces:"
                candidates = ["breaking bad", "mirzapur", "dark"]
            else:
                reply = "Here are atmospheric, razor-sharp detective thrillers with intense moral stakes and shocking twists:"
                candidates = ["se7en", "shutter island", "prisoners"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])
                elif c in MOVIE_REVIEWS:
                    recommendations.append(MOVIE_REVIEWS[c])

        # Case: Mind-Bending with Plot Twists
        elif intent["is_mindbending"]:
            reply = "Ready to have your mind blown? Here are elite films renowned for brilliant non-linear stories and legendary plot twists:"
            candidates = ["source code", "shutter island", "memento", "arrival"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])
                elif c in MOVIE_REVIEWS:
                    recommendations.append(MOVIE_REVIEWS[c])

        # Case: Web Series
        elif intent["is_series"]:
            reply = "Here are top-tier web series with phenomenal storytelling, world-building, and IMDb 8.5+ ratings:"
            candidates = ["breaking bad", "stranger things", "dark", "mirzapur", "panchayat"]
            for c in candidates:
                if c in MOVIE_REVIEWS:
                    recommendations.append(MOVIE_REVIEWS[c])
                elif c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])

        # Fallback general discovery
        else:
            reply = f"Based on your query '{user_message}', here are critically acclaimed favorites that match your cinematic taste:"
            candidates = ["source code", "arrival", "memento", "chichhore"]
            for c in candidates:
                if c in CURATED_MOVIE_METADATA:
                    recommendations.append(CURATED_MOVIE_METADATA[c])

        # Format items with poster URLs
        formatted_recs = []
        for idx, item in enumerate(recommendations[:4], 1):
            formatted_recs.append({
                "rank": idx,
                "title": item["title"],
                "genres": item["genres"],
                "runtime": f"{item.get('runtime_mins', 110)} mins",
                "avg_rating": item.get("avg_rating", 4.3),
                "imdb_rating": item.get("imdb_rating", 8.2),
                "why": item.get("why", item.get("verdict", f"Critically acclaimed {item['genres'].split('|')[0]} favorite with captivating storytelling."))
            })

        return {
            "query": user_message,
            "reply": reply,
            "intent": intent,
            "recommendations": formatted_recs
        }
