export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  likes: number;
  likedBy: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PostFormData {
  title: string;
  content: string;
  tags: string[];
  likes?: number;
}
