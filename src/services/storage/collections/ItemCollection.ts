import { IItemCollection, IItem } from "../interfaces";

export class ItemCollection implements IItemCollection {
  #ids: string[] = [];
  #map: Map<string, IItem> = new Map();
  #idToIndex: Map<string, number> = new Map();

  getIds(): string[] {
    return this.#ids;
  }

  getMap(): Map<string, IItem> {
    return this.#map;
  }

  getItem(id: string): IItem | undefined {
    return this.#map.get(id);
  }

  getIndex(id: string): number | undefined {
    return this.#idToIndex.get(id);
  }

  add(item: IItem): number {
    const index = this.#ids.length;
    this.#ids.push(item.id);
    this.#map.set(item.id, item);
    this.#idToIndex.set(item.id, index);
    return index;
  }

  addBatch(items: IItem[]): number[] {
    const indices: number[] = [];
    items.forEach((item) => {
      indices.push(this.add(item));
    });
    return indices;
  }

  remove(id: string): IItem | null {
    const index = this.#idToIndex.get(id);
    if (index === undefined) return null;

    const item = this.#map.get(id)!;
    const lastIndex = this.#ids.length - 1;

    //
    if (index < lastIndex) {
      const lastId = this.#ids[lastIndex];
      this.#ids[index] = lastId;
      this.#idToIndex.set(lastId, index);
    }

    this.#ids.pop();
    this.#map.delete(id);
    this.#idToIndex.delete(id);

    return item;
  }

  size(): number {
    return this.#ids.length;
  }

  clear(): void {
    this.#ids = [];
    this.#map.clear();
    this.#idToIndex.clear();
  }
}
