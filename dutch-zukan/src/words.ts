// 図鑑のことば。絵は絵文字（Android の Chrome では Google の絵文字で表示される）
// art: 'de' / 'het' はオランダ語の冠詞。保護者メニューで「冠詞もつける」にすると一緒に読む

export interface Word {
  pic: string;
  nl: string;
  art?: 'de' | 'het';
  ja: string;
  /** 色カテゴリ用：絵文字の代わりに塗る色 */
  color?: string;
  /** 数字カテゴリ用：絵文字の代わりに数字と同じ数の丸を出す */
  num?: number;
}

export interface Category {
  id: string;
  pic: string;
  nl: string;
  ja: string;
  color: string;
  words: Word[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'fruit',
    pic: '🍓',
    nl: 'Fruit',
    ja: 'くだもの',
    color: '#ff8a80',
    words: [
      { pic: '🍓', nl: 'aardbei', art: 'de', ja: 'いちご' },
      { pic: '🍎', nl: 'appel', art: 'de', ja: 'りんご' },
      { pic: '🍌', nl: 'banaan', art: 'de', ja: 'バナナ' },
      { pic: '🍇', nl: 'druiven', art: 'de', ja: 'ぶどう' },
      { pic: '🍊', nl: 'sinaasappel', art: 'de', ja: 'みかん' },
      { pic: '🍉', nl: 'watermeloen', art: 'de', ja: 'すいか' },
      { pic: '🍑', nl: 'perzik', art: 'de', ja: 'もも' },
      { pic: '🍒', nl: 'kersen', art: 'de', ja: 'さくらんぼ' },
      { pic: '🍍', nl: 'ananas', art: 'de', ja: 'パイナップル' },
      { pic: '🍋', nl: 'citroen', art: 'de', ja: 'レモン' },
      { pic: '🍐', nl: 'peer', art: 'de', ja: 'なし' },
      { pic: '🥝', nl: 'kiwi', art: 'de', ja: 'キウイ' },
    ],
  },
  {
    id: 'dieren',
    pic: '🐶',
    nl: 'Dieren',
    ja: 'どうぶつ',
    color: '#ffb74d',
    words: [
      { pic: '🐶', nl: 'hond', art: 'de', ja: 'いぬ' },
      { pic: '🐱', nl: 'kat', art: 'de', ja: 'ねこ' },
      { pic: '🐰', nl: 'konijn', art: 'het', ja: 'うさぎ' },
      { pic: '🐻', nl: 'beer', art: 'de', ja: 'くま' },
      { pic: '🐘', nl: 'olifant', art: 'de', ja: 'ぞう' },
      { pic: '🦁', nl: 'leeuw', art: 'de', ja: 'ライオン' },
      { pic: '🐼', nl: 'panda', art: 'de', ja: 'パンダ' },
      { pic: '🐵', nl: 'aap', art: 'de', ja: 'さる' },
      { pic: '🐷', nl: 'varken', art: 'het', ja: 'ぶた' },
      { pic: '🐮', nl: 'koe', art: 'de', ja: 'うし' },
      { pic: '🐔', nl: 'kip', art: 'de', ja: 'にわとり' },
      { pic: '🐴', nl: 'paard', art: 'het', ja: 'うま' },
      { pic: '🐑', nl: 'schaap', art: 'het', ja: 'ひつじ' },
      { pic: '🦆', nl: 'eend', art: 'de', ja: 'あひる' },
      { pic: '🐸', nl: 'kikker', art: 'de', ja: 'かえる' },
      { pic: '🐟', nl: 'vis', art: 'de', ja: 'さかな' },
    ],
  },
  {
    id: 'voertuigen',
    pic: '🚗',
    nl: 'Voertuigen',
    ja: 'のりもの',
    color: '#64b5f6',
    words: [
      { pic: '🚗', nl: 'auto', art: 'de', ja: 'くるま' },
      { pic: '🚌', nl: 'bus', art: 'de', ja: 'バス' },
      { pic: '🚂', nl: 'trein', art: 'de', ja: 'でんしゃ' },
      { pic: '✈️', nl: 'vliegtuig', art: 'het', ja: 'ひこうき' },
      { pic: '🚲', nl: 'fiets', art: 'de', ja: 'じてんしゃ' },
      { pic: '🚢', nl: 'boot', art: 'de', ja: 'ふね' },
      { pic: '🚒', nl: 'brandweerauto', art: 'de', ja: 'しょうぼうしゃ' },
      { pic: '🚑', nl: 'ambulance', art: 'de', ja: 'きゅうきゅうしゃ' },
      { pic: '🚓', nl: 'politieauto', art: 'de', ja: 'パトカー' },
      { pic: '🚁', nl: 'helikopter', art: 'de', ja: 'ヘリコプター' },
      { pic: '🚜', nl: 'tractor', art: 'de', ja: 'トラクター' },
      { pic: '🚀', nl: 'raket', art: 'de', ja: 'ロケット' },
    ],
  },
  {
    id: 'eten',
    pic: '🍞',
    nl: 'Eten',
    ja: 'たべもの',
    color: '#81c784',
    words: [
      { pic: '🍞', nl: 'brood', art: 'het', ja: 'パン' },
      { pic: '🧀', nl: 'kaas', art: 'de', ja: 'チーズ' },
      { pic: '🥚', nl: 'ei', art: 'het', ja: 'たまご' },
      { pic: '🥛', nl: 'melk', art: 'de', ja: 'ぎゅうにゅう' },
      { pic: '🍦', nl: 'ijsje', art: 'het', ja: 'アイス' },
      { pic: '🍪', nl: 'koekje', art: 'het', ja: 'クッキー' },
      { pic: '🍰', nl: 'taart', art: 'de', ja: 'ケーキ' },
      { pic: '🥕', nl: 'wortel', art: 'de', ja: 'にんじん' },
      { pic: '🍅', nl: 'tomaat', art: 'de', ja: 'トマト' },
      { pic: '🌽', nl: 'maïs', art: 'de', ja: 'とうもろこし' },
      { pic: '🍚', nl: 'rijst', art: 'de', ja: 'ごはん' },
      { pic: '🍕', nl: 'pizza', art: 'de', ja: 'ピザ' },
    ],
  },
  {
    id: 'kleuren',
    pic: '🎨',
    nl: 'Kleuren',
    ja: 'いろ',
    color: '#ba68c8',
    words: [
      { pic: '', nl: 'rood', ja: 'あか', color: '#e53935' },
      { pic: '', nl: 'blauw', ja: 'あお', color: '#1e88e5' },
      { pic: '', nl: 'geel', ja: 'きいろ', color: '#fdd835' },
      { pic: '', nl: 'groen', ja: 'みどり', color: '#43a047' },
      { pic: '', nl: 'oranje', ja: 'オレンジ', color: '#fb8c00' },
      { pic: '', nl: 'roze', ja: 'ピンク', color: '#f48fb1' },
      { pic: '', nl: 'paars', ja: 'むらさき', color: '#8e24aa' },
      { pic: '', nl: 'bruin', ja: 'ちゃいろ', color: '#795548' },
      { pic: '', nl: 'wit', ja: 'しろ', color: '#ffffff' },
      { pic: '', nl: 'zwart', ja: 'くろ', color: '#212121' },
    ],
  },
  {
    id: 'getallen',
    pic: '🔢',
    nl: 'Getallen',
    ja: 'かず',
    color: '#4db6ac',
    words: [
      { pic: '', nl: 'één', ja: 'いち', num: 1 },
      { pic: '', nl: 'twee', ja: 'に', num: 2 },
      { pic: '', nl: 'drie', ja: 'さん', num: 3 },
      { pic: '', nl: 'vier', ja: 'よん', num: 4 },
      { pic: '', nl: 'vijf', ja: 'ご', num: 5 },
      { pic: '', nl: 'zes', ja: 'ろく', num: 6 },
      { pic: '', nl: 'zeven', ja: 'なな', num: 7 },
      { pic: '', nl: 'acht', ja: 'はち', num: 8 },
      { pic: '', nl: 'negen', ja: 'きゅう', num: 9 },
      { pic: '', nl: 'tien', ja: 'じゅう', num: 10 },
    ],
  },
];
