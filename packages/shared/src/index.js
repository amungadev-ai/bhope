import { books } from './books.js';
export { books };

export { extractReferences, createReferenceExtractor, referenceRules } from './references.js';
export { getTikTokVideoId, getTikTokPlayerUrl, createNote } from './inspirations.js';
export { publicationDay, isPublicationDate, filterDevotionals } from './devotionals.js';

export function formatReference(reference, language = 'en') {
  const book = books.find((item) => item.id === reference.bookId);
  if (!book) return '';
  const verses =
    reference.verseStart === undefined
      ? ''
      : `:${reference.verseStart}${reference.verseEnd && reference.verseEnd !== reference.verseStart ? `–${reference.verseEnd}` : ''}`;
  return `${book[language]} ${reference.chapter}${verses}`;
}

export const devotionalSeeds = [
  {
    id: 'hope-for-today',
    category: 'HOPE',
    bookId: 19,
    chapter: 23,
    verseStart: 1,
    verseEnd: 3,
    minutes: 4,
    en: {
      title: 'There is hope in the quiet',
      subtitle: 'You do not have to carry tomorrow today.',
      reflection:
        'A shepherd leads one step at a time. We often want the whole map: the next opportunity, the answer to our prayer, the way through uncertainty. Psalm 23 invites us to receive something simpler: the presence of God in this moment.\n\nRest is not a reward for having everything figured out. It is an invitation to trust the One who knows the path. Today, let one quiet moment interrupt the noise. Notice what you have been carrying alone, and bring it honestly to God.',
      application:
        'Take five quiet minutes. Name one worry, write one thing you are grateful for, and choose one small act of kindness.',
      prayer:
        'Loving Father, meet me in the ordinary moments of today. Help me receive Your care, walk with courage, and offer hope to someone else. Amen.',
      question: 'Where could you make room for a little more trust today?',
    },
    sw: {
      title: 'Kuna tumaini katika utulivu',
      subtitle: 'Huhitaji kubeba kesho leo.',
      reflection:
        'Mchungaji huongoza hatua kwa hatua. Mara nyingi tunataka kujua njia yote: nafasi inayofuata, jibu la sala, na namna ya kushinda mashaka. Zaburi 23 inatualika kupokea uwepo wa Mungu katika wakati huu.\n\nKupumzika si zawadi ya kuwa na majibu yote. Ni mwaliko wa kumwamini anayejua njia. Leo, tenga muda mfupi wa utulivu. Tambua mzigo ulioubeba peke yako, kisha umweleze Mungu kwa uaminifu.',
      application:
        'Tenga dakika tano za utulivu. Andika jambo moja linalokutia wasiwasi, jambo moja la kushukuru, na tendo moja la wema utakalochagua.',
      prayer:
        'Baba mwenye upendo, kutana nami katika shughuli za leo. Nisaidie kupokea utunzaji Wako, kutembea kwa ujasiri, na kumpa mwingine tumaini. Amina.',
      question: 'Ni sehemu gani ya maisha yako inayohitaji kumwamini Mungu zaidi leo?',
    },
  },
  {
    id: 'peace-in-the-pause',
    category: 'PEACE',
    bookId: 50,
    chapter: 4,
    verseStart: 6,
    verseEnd: 7,
    minutes: 3,
    en: {
      title: 'Peace in the pause',
      subtitle: 'A small invitation to bring your worries to God.',
      reflection:
        'Prayer makes room for honesty. You do not need polished words before you can speak to God. Bring the concern that keeps returning to your mind. Alongside it, name a gift you have received. Gratitude does not erase difficulty; it helps us remember that difficulty is not the whole story.',
      application: 'Write a short prayer about one concern, followed by one sentence of thanks.',
      prayer:
        'God of peace, help me bring my whole heart to You. Give me patience for this day and wisdom for the next step. Amen.',
      question: 'What would you like to bring to God in prayer?',
    },
    sw: {
      title: 'Amani katika pumziko',
      subtitle: 'Mwaliko wa kumpelekea Mungu wasiwasi wako.',
      reflection:
        'Sala hutupa nafasi ya kusema ukweli. Huhitaji maneno makamilifu ili kuzungumza na Mungu. Mweleze jambo linalorudi akilini mwako. Kisha taja zawadi moja uliyopokea. Shukrani haiondoi magumu, lakini hutukumbusha kuwa magumu si hadithi nzima.',
      application:
        'Andika sala fupi kuhusu jambo moja linalokusumbua, kisha ongeza sentensi ya shukrani.',
      prayer:
        'Mungu wa amani, nisaidie kuleta moyo wangu wote mbele Zako. Nipe subira ya leo na hekima kwa hatua inayofuata. Amina.',
      question: 'Ungependa kumpelekea Mungu jambo gani katika sala?',
    },
  },
];
