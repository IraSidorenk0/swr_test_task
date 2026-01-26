
export interface CommentsData {
    postId: string;
    commentId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    createdAtFallback: string;
}
