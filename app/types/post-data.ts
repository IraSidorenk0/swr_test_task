import { Timestamp } from "firebase-admin/firestore";

export interface PostData {
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  likes: number;
  createdAt: Timestamp; 
  updatedAt: Timestamp; 
  createdAtFallback: string;
}
