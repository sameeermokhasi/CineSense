/**
 * services/descriptions.js
 * Curated and dynamic 3-5 line rich movie descriptions
 */

const MOVIE_DESCRIPTIONS = {
  // Iconic Bollywood Films
  "dilwale dulhania le jayenge": "Raj and Simran meet on a scenic rail journey across Europe and fall deeply in love, but Simran is already promised to marry a childhood acquaintance in India. Refusing to elope, Raj travels to Punjab to win the heart and blessing of her stern, traditional father in this beloved romantic classic celebrating enduring devotion and family heritage.",
  
  "3 idiots": "Two close friends set out on an unforgettable road trip across India in search of their long-lost college companion, Rancho, whose rebellious brilliance and passion revolutionized their engineering years. Along the way, they reflect on academic pressure, chasing excellence over success, and the unforgettable bond of lifelong brotherhood.",
  
  "lagaan: once upon a time in india": "In Victorian-era India, a drought-stricken village faces crushing agricultural taxes from oppressive British rulers. Led by the courageous Bhuvan, the villagers accept a daring challenge: a high-stakes game of cricket against the British regiment to wipe out their taxes for three years and restore their community's pride.",
  
  "like stars on earth (taare zameen par)": "Ishaan, an imaginative eight-year-old boy, is misunderstood and labeled a troublemaker due to his struggles with reading and writing. When sent to a strict boarding school, an empathetic art teacher discovers Ishaan's dyslexia and creative genius, embarking on a heartwarming journey to help him shine.",
  
  "swades: we, the people": "Mohan Bhargava, a dedicated NASA project manager, returns to rural India on a brief visit to find his beloved childhood nanny. Deeply moved by the village's daily struggles with electricity, access, and education, Mohan decides to dedicate his scientific expertise to bring sustainable light and hope to his motherland.",
  
  "sholay": "After a ruthless dacoit named Gabbar Singh brutally slaughters his family, a retired police inspector hires two fearless ex-convicts, Veeru and Jai, to capture the outlaw alive. Set across the rugged ravines of Ramgarh, this timeless epic unfolds with unforgettable friendship, thunderous action, and unmatched heroism.",
  
  "gangs of wasseypur": "Spanning over sixty turbulent years, the violent coal mafia of Dhanbad fuels an explosive generational blood feud between rival families. Packed with raw intensity, dark humor, and relentless retribution, this epic crime saga delves deep into the gritty underworld of political power and vengeance.",
  
  "pk": "A wide-eyed humanoid alien arrives on Earth to study human life but loses his spaceship remote to a thief in Rajasthan. Stranded in New Delhi, his innocent and logical questions about religious dogma, godmen, and cultural rituals spark a nationwide conversation on faith, love, and truth.",
  
  "devdas": "After returning from his studies in London, Devdas hopes to marry his childhood love Paro, but rigid social barriers and family pride tear them apart. Plunged into sorrow and alcoholism, Devdas seeks solace in the company of courtesan Chandramukhi, spiraling into a tragic and visual masterpiece of unfulfilled love.",
  
  "hum aapke hain koun...!": "Prem and Nisha fall in love during the grand festivities of their siblings' arranged marriage. However, when an unexpected family tragedy threatens the happiness of everyone they hold dear, the two young lovers must choose between their personal desires and selfless familial duty.",

  // Iconic Hollywood & International Films
  "pulp fiction": "The lives of two philosophical mob hitmen, a courageous prizefighter, a reckless gangster's wife, and a pair of diner bandits collide in a series of bizarre, darkly comedic events across Los Angeles. A cinematic tour de force renowned for its non-linear storytelling, razor-sharp dialogue, and unforgettable style.",
  
  "inception": "Dom Cobb is a master extractor who infiltrates the subconscious minds of corporate targets while they sleep to steal their deepest secrets. Given a rare chance to erase his criminal past and reunite with his children, Cobb is tasked with the ultimate challenge: planting a brand-new idea into a mogul's mind across three descending layers of dreams.",
  
  "the dark knight": "Batman, Lieutenant James Gordon, and District Attorney Harvey Dent form an alliance to dismantle organized crime in Gotham City. However, their efforts are plunged into pure anarchy by the arrival of the Joker, a criminal mastermind who seeks to expose the dark hypocrisy of humanity and push the city to its moral edge.",
  
  "interstellar": "As crop blights and dust storms render Earth uninhabitable, an ex-pilot turned farmer is recruited for a top-secret mission to pilot a spacecraft through a newly discovered wormhole near Saturn. Leaving his family behind, he journeys across distant galaxies in a desperate quest to secure a new home for mankind.",
  
  "matrix, the": "Thomas Anderson lives a quiet life as a software programmer by day and an elusive hacker known as Neo by night. When he is contacted by the enigmatic Morpheus, Neo awakens to the shocking truth that reality is an elaborate cybernetic simulation created by machines to harvest humanity's energy.",
  
  "fight club": "A disillusioned office worker suffering from chronic insomnia finds relief when he crosses paths with a charismatic soap salesman named Tyler Durden. Together, they create an underground fight club for men looking to feel alive, which rapidly mutates into a nationwide anti-consumerist revolution.",
  
  "goodfellas": "Henry Hill grows up idolizing the neighborhood mobsters and gradually climbs the ranks of the New York mafia over three decades. Embracing the glamorous life of wealth and power, Henry's world turns volatile as greed, violent betrayals, and drug paranoia threaten to destroy everything he built.",
  
  "spirited away": "While moving to a new neighborhood, ten-year-old Chihiro inadvertently wanders into a magical, spirit-inhabited bathhouse ruled by the sorceress Yubaba. With her parents transformed into pigs, Chihiro must summon immense courage, work diligently, and find a way to break the curse before she forgets her real name.",
  
  "the godfather": "Don Vito Corleone, the aging patriarch of an influential New York mafia dynasty, faces ruthless rival families threatening his empire. When an assassination attempt incapacitates Vito, his youngest war-hero son, Michael, reluctantly steps into the brutal family business, transforming into a calculating and merciless leader.",
  
  "heat": "An elite master thief and his disciplined crew orchestrate high-stakes bank heists across Los Angeles while a relentless, obsessive detective tracks their every move. As the cat-and-mouse game intensifies, both men discover startling parallels between their dedication to their crafts and their alienated personal lives."
};

/**
 * Returns a rich 3-5 line description for any movie title
 */
export function getMovieDescription(title, genres = "", year = "") {
  if (!title) return "A compelling cinematic journey exploring captivating storylines, unique character arcs, and unforgettable cinematic craft.";

  const clean = title.toLowerCase().replace(/\s*\(\d{4}\)/, '').trim();

  // 1. Direct match or substring match from curated library
  for (const [key, desc] of Object.entries(MOVIE_DESCRIPTIONS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return desc;
    }
  }

  // 2. Dynamic high-quality synopsis synthesizer based on title, genre, and era
  const gList = genres ? genres.split('|').map(s => s.trim().toLowerCase()) : [];
  const yr = year || (title.match(/\((\d{4})\)/)?.[1] || '');

  const eraText = yr ? `Released in ${yr}, this` : "This";

  if (gList.includes("comedy") && gList.includes("romance")) {
    return `${eraText} heartwarming romantic comedy weaves playful charm, witty dialogue, and tender emotional moments. As two distinctive personalities cross paths, unexpected misunderstandings and delightful adventures pave the way for a memorable celebration of love and companionship.`;
  }

  if (gList.includes("sci-fi") || gList.includes("fantasy")) {
    return `${eraText} visionary sci-fi epic takes viewers on an extraordinary journey through wondrous worlds and high-concept imagination. Blending grand conceptual worldbuilding with intimate character stakes, it explores human curiosity, technological frontiers, and the timeless struggle for survival.`;
  }

  if (gList.includes("crime") || gList.includes("thriller")) {
    return `${eraText} gripping crime thriller delivers sharp suspense, complex motives, and atmospheric tension from start to finish. Navigating high-stakes confrontations, moral dilemmas, and sudden twists, it plunges deep into the minds of characters caught between ambition and retribution.`;
  }

  if (gList.includes("action") || gList.includes("adventure")) {
    return `${eraText} exhilarating adventure combines pulse-pounding action sequences with an inspiring quest across uncharted territories. Driven by courageous heroes and unrelenting obstacles, it offers a thrilling cinematic spectacle filled with determination, peril, and triumphant spirit.`;
  }

  if (gList.includes("drama")) {
    return `${eraText} profound dramatic piece explores the intricate depth of human relationships, personal resilience, and life-changing choices. Through compelling performances and authentic storytelling, it paints a touching portrait of struggle, transformation, and enduring hope.`;
  }

  if (gList.includes("horror")) {
    return `${eraText} chilling psychological tale immerses audiences in an unsettling atmosphere of dread, suspense, and mysterious occurrences. As dark secrets unravel, the characters are pushed to their psychological limits in a gripping struggle against the unknown.`;
  }

  if (gList.includes("animation") || gList.includes("children")) {
    return `${eraText} enchanting animated feature brings vivid artistry, delightful humor, and timeless life lessons to viewers of all ages. Filled with whimsical characters and an inspiring heart, it celebrates friendship, discovery, and the boundless power of imagination.`;
  }

  return `${eraText} acclaimed film offers a memorable cinematic experience defined by rich storytelling, nuanced performances, and distinctive visual style. A standout favorite that continues to resonate with movie lovers and audiences worldwide.`;
}
