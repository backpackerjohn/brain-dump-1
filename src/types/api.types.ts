import { ThoughtWithCategories, Cluster, Connection } from './thought.types';

export interface ProcessThoughtRequest {
  content: string;
}

export interface ProcessThoughtResponse {
  thoughts: ThoughtWithCategories[];
}

export interface SuggestCategoriesRequest {
  thoughtId: string;
  existingCategories: string[];
}

export interface SuggestCategoriesResponse {
  categories: string[];
}

export interface GenerateClustersResponse {
  clusters: Cluster[];
}

export interface FindConnectionsResponse {
  connections: Connection[];
}
