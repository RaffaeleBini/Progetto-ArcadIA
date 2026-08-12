import { Router } from "express";
import { verifyCertificate } from "../controllers/progress.controller.js";

const router = Router();

router.get("/:certificateId", verifyCertificate);

export default router;
