import { Router } from "express";
import {
  commentSchema,
  createComment,
  createPost,
  deletePost,
  listComments,
  listPosts,
  postSchema,
} from "../controllers/posts.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

router.get("/", requireAuth, listPosts);
router.post("/", requireAuth, validateBody(postSchema), createPost);
router.delete("/:id", requireAuth, deletePost);

router.get("/:id/comments", requireAuth, listComments);
router.post("/:id/comments", requireAuth, validateBody(commentSchema), createComment);

export default router;
