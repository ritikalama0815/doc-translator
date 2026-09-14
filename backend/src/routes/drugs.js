/**
 * @fileoverview Drug name lookup: local {@link closestDrug} list plus NIH RxNorm.
 * @module routes/drugs
 */

import { Router } from "express";
import { validateDrug } from "../services/rxnorm.js";
import { closestDrug } from "../data/drugs-common.js";

const router = Router();

router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    res.json({ local: null, rxnorm: null });
    return;
  }
  const local = closestDrug(q);
  const rxnorm = await validateDrug(q);
  res.json({ local, rxnorm });
});

/** Express router mounted at `/api/drugs`. */
export default router;
