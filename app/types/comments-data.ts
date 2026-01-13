import { Timestamp } from "firebase/firestore";

export interface CommentsData {
    postId: string;
    commentId: string;
    userId: string;
    content: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdAtFallback: string;
}
