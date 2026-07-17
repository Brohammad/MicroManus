export type ArtifactType = "pdf";

export interface Artifact {
  id: string;
  chatId: string;
  type: ArtifactType;
  title: string;
  storagePath: string;
  createdAt: string;
}

export interface CreateArtifactInput {
  chatId: string;
  type: ArtifactType;
  title: string;
  storagePath: string;
}

export interface ArtifactRepository {
  create(input: CreateArtifactInput): Promise<Artifact>;
  listByChat(chatId: string, userId: string): Promise<Artifact[]>;
  getById(id: string, userId: string): Promise<Artifact | null>;
}
