export interface IDocument {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  value: number;
  category: string;
}

export interface IDocumentCollection {
  getDocumentIds(): string[];
  getDocumentsMap(): Map<string, IDocument>;
  getDocument(id: string): IDocument | undefined;
  getDocumentIndex(id: string): number | undefined;
  add(document: IDocument): number;
  remove(id: string): IDocument | null;
  size(): number;
}

export interface ISearchResult {
  documentIds: string[];
  totalCount: number;
}

export interface ISession {
  searchQuery: string;
  resultDocumentIds: string[];
  currentCursor: number;
  expiresAt: number;
  searchInSelected: boolean;
}
