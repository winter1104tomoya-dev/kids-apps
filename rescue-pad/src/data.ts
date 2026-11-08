// 隊員とミッションのデータ。キャラクターはすべてこのアプリのオリジナル

export interface Member {
  id: string;
  name: string;
  /** しごと（画面に出す） */
  job: string;
  /** 顔の絵（src/img/*.webp） */
  img: string;
  /** のりもの */
  car: string;
  color: string;
  /** 返事のことば */
  line: string;
  /** 声の高さ（音声合成の pitch） */
  pitch: number;
}

export const MEMBERS: Member[] = [
  { id: 'fox', name: 'ホムラ', job: 'しょうぼう', img: 'fox', car: 'fire_engine', color: '#e53935', line: 'ひのことなら、まかせて！', pitch: 1.25 },
  { id: 'bear', name: 'マモル', job: 'けいさつ', img: 'bear', car: 'police_car', color: '#1e6fd9', line: 'みんなを、まもるよ！', pitch: 0.8 },
  { id: 'owl', name: 'ハネ', job: 'そら', img: 'owl', car: 'helicopter', color: '#8e44ad', line: 'そらから、ひとっとび！', pitch: 1.05 },
  { id: 'penguin', name: 'ナミ', job: 'うみ', img: 'penguin', car: 'motor_boat', color: '#00a3a3', line: 'うみなら、まかせて！', pitch: 1.4 },
  { id: 'beaver', name: 'ガッチ', job: 'こうじ', img: 'beaver', car: 'tractor', color: '#f2a100', line: 'がっちり、なおすよ！', pitch: 0.9 },
  { id: 'rabbit', name: 'ミミ', job: 'きゅうきゅう', img: 'rabbit_face', car: 'ambulance', color: '#e8559a', line: 'すぐに、てあてするね！', pitch: 1.55 },
];

export interface Mission {
  id: string;
  /** 正解の隊員 */
  member: string;
  /** 困りごとの絵（1〜2枚） */
  pics: string[];
  /** 困りごと（画面と読み上げ） */
  text: string;
}

export const MISSIONS: Mission[] = [
  { id: 'house-fire', member: 'fox', pics: ['house', 'fire'], text: 'おうちが かじだ！' },
  { id: 'forest-fire', member: 'fox', pics: ['deciduous_tree', 'fire'], text: 'もりで ひが もえてる！' },
  { id: 'cow', member: 'bear', pics: ['cow_face'], text: 'うしさんが にげちゃった！' },
  { id: 'chick', member: 'bear', pics: ['hatching_chick'], text: 'ひよこが まいごに なっちゃった！' },
  { id: 'cat', member: 'owl', pics: ['deciduous_tree', 'cat_face'], text: 'ねこが きから おりられない！' },
  { id: 'kite', member: 'owl', pics: ['kite', 'mountain'], text: 'たこが やまに ひっかかった！' },
  { id: 'dolphin', member: 'penguin', pics: ['dolphin'], text: 'いるかさんが こまってる！' },
  { id: 'canoe', member: 'penguin', pics: ['canoe'], text: 'ボートが ながされちゃった！' },
  { id: 'rock', member: 'beaver', pics: ['rock'], text: 'みちに おおきな いわが！' },
  { id: 'bridge', member: 'beaver', pics: ['bridge_at_night', 'construction'], text: 'はしが こわれちゃった！' },
  { id: 'bandage', member: 'rabbit', pics: ['adhesive_bandage'], text: 'ころんで けがしちゃった！' },
  { id: 'fever', member: 'rabbit', pics: ['face_with_thermometer'], text: 'ねつが でちゃった！' },
];
