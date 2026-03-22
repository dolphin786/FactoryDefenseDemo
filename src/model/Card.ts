import type { BuildingType } from '../config/BuildingConfig';

export type CardType = 'resource' | 'production' | 'defense' | 'storage';

export interface CardData {
  id: number;
  type: CardType;
  // resource 卡
  resourceType?: 'iron' | 'copper';
  durability?: number;
  // 建筑卡
  buildingType?: BuildingType;
}

let _nextId = 1;
export function resetCardId(): void { _nextId = 1; }
export function nextCardId(): number { return _nextId++; }

export function makeCard(data: Omit<CardData, 'id'>): CardData {
  return { id: nextCardId(), ...data };
}
