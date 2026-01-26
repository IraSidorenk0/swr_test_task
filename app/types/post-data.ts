export interface PostData {
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  likes: number;
  createdAt: Date; 
  updatedAt: Date; 
  createdAtFallback: string;
}
