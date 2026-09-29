import { RarityType } from '../types/game';

export interface RarityStyleDefinition {
  badge: string;
  border: string;
  bg: string;
  text: string;
}

export const RARITY_STYLES: Record<RarityType, RarityStyleDefinition> = {
  common: {
    badge: 'bg-stone-100 text-stone-600 border-stone-200',
    border: 'border-stone-200',
    bg: 'bg-stone-50/80',
    text: 'text-stone-500'
  },
  uncommon: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-500'
  },
  rare: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    border: 'border-sky-200',
    bg: 'bg-sky-50/50',
    text: 'text-sky-500'
  },
  epic: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-purple-200',
    bg: 'bg-purple-50/50',
    text: 'text-purple-500'
  },
  legendary: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    text: 'text-amber-500'
  }
};