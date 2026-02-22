import { IDocumentCollection, IDocument } from "../interfaces";

export class DocumentCollection implements IDocumentCollection {
  #documentIds: string[] = [];
  #documentsById: Map<string, IDocument> = new Map();
  #documentIdToIndex: Map<string, number> = new Map();

  getDocumentIds(): string[] {
    return this.#documentIds;
  }

  getDocumentsMap(): Map<string, IDocument> {
    return this.#documentsById;
  }

  getDocument(documentId: string): IDocument | undefined {
    return this.#documentsById.get(documentId);
  }

  getDocumentIndex(documentId: string): number | undefined {
    return this.#documentIdToIndex.get(documentId);
  }

  add(document: IDocument): number {
    const index = this.#documentIds.length;
    this.#documentIds.push(document.id);
    this.#documentsById.set(document.id, document);
    this.#documentIdToIndex.set(document.id, index);
    return index;
  }

  addBatch(documents: IDocument[]): number[] {
    const indices: number[] = [];
    documents.forEach((document) => {
      indices.push(this.add(document));
    });
    return indices;
  }

  remove(documentId: string): IDocument | null {
    const index = this.#documentIdToIndex.get(documentId);
    if (index === undefined) return null;

    const document = this.#documentsById.get(documentId)!;
    const lastIndex = this.#documentIds.length - 1;

    if (index < lastIndex) {
      const lastDocumentId = this.#documentIds[lastIndex];
      this.#documentIds[index] = lastDocumentId;
      this.#documentIdToIndex.set(lastDocumentId, index);
    }

    this.#documentIds.pop();
    this.#documentsById.delete(documentId);
    this.#documentIdToIndex.delete(documentId);

    return document;
  }

  size(): number {
    return this.#documentIds.length;
  }

  clear(): void {
    this.#documentIds = [];
    this.#documentsById.clear();
    this.#documentIdToIndex.clear();
  }
}
