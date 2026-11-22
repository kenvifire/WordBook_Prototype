import type { Level, Section, Story, StoryVersion, WordCard } from "./types";

// "word|meaning" — 20 per section, shared by both levels of a story.
type Raw = { id: string; title: string; author: string; genre: Story["genre"]; blurb: string; minutes: number;
  sections: { title: string; text: Record<"B1" | "B2", string>; words: string[] }[] }; // mock data has B1 and B2 only

const raw: Raw[] = [
  {
    id: "alice", title: "Alice in Wonderland", author: "Lewis Carroll", genre: "fantasy", minutes: 8,
    blurb: "A girl follows a white rabbit into a strange world.",
    sections: [
      { title: "Down the Rabbit Hole",
        text: { B1: "Alice was bored by the river. Suddenly a white rabbit ran past her. It looked at a watch and said, \"I am late!\" Alice followed it into a deep hole.", B2: "Alice was growing bored on the riverbank when a white rabbit hurried past, checking a pocket watch and muttering that it was late. Curious, she followed it straight down a deep hole." },
        words: ["rabbit|a small animal with long ears","bored|not interested; with nothing to do","riverbank|the land next to a river","suddenly|very quickly, with no warning","watch|a small clock you wear","late|after the right time","follow|go after someone","hole|an empty space in the ground","deep|going far down","fall|go down to the ground","curious|wanting to know more","strange|not normal; odd","tunnel|a long way under the ground","shelf|a flat board on a wall","jar|a glass container","land|come down onto the ground","hall|a long room with doors","key|a metal thing that opens a door","tiny|very, very small","garden|land with flowers and plants"] },
      { title: "Drink Me",
        text: { B1: "On a table there was a small bottle. It said \"Drink me\". Alice drank it and became very small. Now she could fit through the little door.", B2: "On a glass table stood a small bottle labelled \"Drink me\". Alice sipped it cautiously and began to shrink until she was small enough to fit through the tiny door." },
        words: ["bottle|a container for drinks","label|a paper with words on a thing","drink|take liquid into your mouth","shrink|become smaller","grow|become bigger","fit|be the right size","door|you open it to go in","cake|a sweet food you bake","taste|the flavour of food","tears|water from your eyes when you cry","pool|a small area of water","swim|move through water","mouse|a very small animal","cry|make tears because you are sad","careful|thinking about danger","enormous|very, very big","ceiling|the top of a room","glove|you wear it on your hand","fan|a thing that moves air","worried|feeling a little afraid"] },
      { title: "The Mad Tea Party",
        text: { B1: "Alice found a long table. A Hatter and a March Hare were having tea. They asked silly questions and changed seats all the time.", B2: "Alice came upon a long table where the Hatter and the March Hare were having tea, asking riddles with no answers and moving seats whenever their cups were empty." },
        words: ["hatter|a person who makes hats","hare|an animal like a big rabbit","tea|a hot drink","party|a happy meeting with food","seat|a place to sit","riddle|a question that is a game","answer|what you say to a question","rude|not polite","polite|kind and nice in how you talk","silly|funny and not serious","cup|you drink from it","sleepy|wanting to sleep","pour|make liquid go into a cup","nonsense|words with no meaning","queen|a woman who rules a country","card|a flat piece of paper for games","rose|a flower","paint|put colour on something","angry|very not happy","wake|stop sleeping"] },
    ],
  },
  {
    id: "holmes", title: "The Speckled Band", author: "Arthur Conan Doyle", genre: "mystery", minutes: 10,
    blurb: "A scared woman asks Sherlock Holmes for help. Her sister died in a strange way.",
    sections: [
      { title: "A Visitor at Dawn",
        text: { B1: "Early one morning, a young woman came to Baker Street. She was shaking. \"Mr Holmes, please help me,\" she said. \"I am afraid.\"", B2: "At dawn a young woman arrived at Baker Street, trembling and pale. \"Mr Holmes,\" she whispered, \"I have nobody else to turn to.\"" },
        words: ["dawn|very early morning","visitor|a person who comes to see you","shake|move quickly because of fear or cold","afraid|feeling fear","pale|with a white face","whisper|speak very quietly","detective|a person who solves crimes","clue|a thing that helps solve a problem","sister|a girl with the same parents","death|the end of life","strange|not normal","sound|something you hear","whistle|a high sound","night|the dark time","lock|close with a key","window|glass in a wall","stepfather|your mother's new husband","danger|something that can hurt you","scream|a very loud cry","band|a thin strip of material"] },
      { title: "The House",
        text: { B1: "Holmes and Watson went to the old house. They looked at the rooms. There was a bell rope, but it did not ring.", B2: "Holmes and Watson travelled to the crumbling manor and examined each room. Holmes noticed a bell rope that, oddly, was not connected to any bell." },
        words: ["manor|a big old house in the country","examine|look at very carefully","bell|it makes a ring sound","rope|a thick string","notice|see something","ring|make a bell sound","bed|you sleep in it","fixed|not able to move","vent|a small hole for air","wall|the side of a room","safe|a strong metal box","milk|a white drink","saucer|a small plate","dog leash|a rope to walk a dog","lamp|it gives light","floor|you walk on it","dust|very small dirt","boots|strong shoes","nervous|a little afraid","plan|an idea of what to do"] },
      { title: "The Answer",
        text: { B1: "That night Holmes waited in the dark. He heard a soft whistle. A snake came down the rope! Holmes hit it, and the mystery was over.", B2: "That night Holmes waited in total darkness until a low whistle sounded and a deadly snake slid down the rope. He struck it, and the mystery was finally solved." },
        words: ["darkness|when there is no light","wait|stay until something happens","soft|quiet; not loud","snake|a long animal with no legs","deadly|able to kill","slide|move smoothly","strike|hit hard","stick|a long thin piece of wood","solve|find the answer","mystery|something nobody understands","truth|what is really true","guilty|did something wrong","poison|something that kills if you eat it","bite|cut with teeth","escape|get away","brave|not afraid","silent|with no sound","candle|wax that gives light","police|people who keep the law","relief|good feeling when fear ends"] },
    ],
  },
  {
    id: "frog", title: "The Jumping Frog", author: "Mark Twain", genre: "funny", minutes: 7,
    blurb: "A man bets on everything. Then he gets a frog that can jump very far.",
    sections: [
      { title: "Jim Smiley",
        text: { B1: "Jim Smiley loved to bet. He bet on horses, dogs and even birds. If two birds sat on a fence, he bet which one would fly first.", B2: "Jim Smiley would bet on absolutely anything: horse races, dog fights, even which of two birds on a fence would fly away first." },
        words: ["bet|risk money on what will happen","win|be the best; get the prize","lose|not win","money|you use it to buy things","horse|a big animal you can ride","race|a competition of speed","fence|a wooden wall around land","fly|move in the air","lucky|having good things happen","town|a small city","stranger|a person you do not know","story|words about what happened","talk|speak","boring|not interesting","slow|not fast","fight|try to hurt each other","bird|an animal with wings","always|every time","even|surprisingly also","chance|a possibility"] },
      { title: "Dan'l Webster",
        text: { B1: "Jim caught a frog and called it Dan'l Webster. Every day he taught it to jump. Soon it could jump farther than any frog in the county.", B2: "Jim caught a frog, named it Dan'l Webster, and trained it for months until it could out-jump every frog in the county." },
        words: ["frog|a small green animal that jumps","jump|push up into the air","catch|take hold of something","teach|help someone learn","train|practise to get better","practice|doing something again and again","far|a long way","county|an area of land in a state","proud|happy about what you did","box|a container","fly (insect)|a small insect","quick|fast","smart|clever","famous|known by many people","show|let people see","yard|the land next to a house","land|come down after a jump","clap|hit your hands together","crowd|many people together","champion|the best of all"] },
      { title: "The Trick",
        text: { B1: "A stranger bet against Dan'l. When Jim was away, the stranger put small stones in the frog's mouth. Dan'l could not jump at all!", B2: "A stranger accepted the bet, but while Jim was distracted he secretly filled Dan'l's mouth with quail shot. The poor frog couldn't move an inch." },
        words: ["trick|something done to fool someone","stone|a small piece of rock","mouth|you eat with it","heavy|weighs a lot","secret|hidden from others","fool|make someone believe a wrong thing","distracted|not paying attention","inch|a small length","angry|very not happy","shake|move quickly up and down","run away|leave fast","shocked|very surprised","cheat|break rules to win","laugh|make a happy sound","funny|makes you laugh","poor|you feel sorry for it","pick up|lift from the ground","upside down|top at the bottom","chase|run after","end|the last part"] },
    ],
  },
];

function cardsFor(storyId: string, level: Level, si: number, words: string[]): WordCard[] {
  return words.map((w, i) => {
    const [word = "", meaning = ""] = w.split("|");
    return { id: `${storyId}-${level}-s${si + 1}-c${i + 1}`, word, meaning, example: `You will see "${word}" in this part of the story.` };
  });
}

export const stories: Story[] = raw.map((r) => ({
  id: r.id, title: r.title, author: r.author, genre: r.genre, blurb: r.blurb, minutes: r.minutes,
  versions: (["B1", "B2"] as const).map((level): StoryVersion => ({
    id: `${r.id}-${level}`, storyId: r.id, level, status: level === "B1" ? "approved" : "draft",
    sections: r.sections.map((s, si): Section => ({
      id: `${r.id}-${level}-s${si + 1}`, storyId: r.id, level, order: si + 1, title: s.title, text: s.text[level],
      cards: cardsFor(r.id, level, si, s.words),
    })),
  })),
}));

export const getStory = (id: string) => stories.find((s) => s.id === id);
export const getVersion = (id: string) => stories.flatMap((s) => s.versions).find((v) => v.id === id);
export const getSection = (id: string) => stories.flatMap((s) => s.versions.flatMap((v) => v.sections)).find((s) => s.id === id);

export const mockLearner = { pseudonym: "Reader-042", level: "B1" as Level, streak: 4, wordsLearned: 37, storiesRead: 1, dueReviews: 12, gatePercent: 80 };
