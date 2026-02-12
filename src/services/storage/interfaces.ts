export interface IItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  value: number;
  category: string;
}

export interface IItemCollection {
  getIds(): string[];
  getMap(): Map<string, IItem>;
  getItem(id: string): IItem | undefined;
  getIndex(id: string): number | undefined;
  add(Item: IItem): number;
  remove(id: string): IItem | null;
  size(): number;
}

export interface ISearchResult {
  ids: string[];
  totalCount: number;
}

export interface ISessionData {
  searchKey: string;
  resultIds: string[];
  cursor: number;
  expiresAt: number;
  searchInSelected: boolean;
}
