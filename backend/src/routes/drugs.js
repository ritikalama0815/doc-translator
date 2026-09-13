// Drug name lookup: local common list + RxNorm.
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

export default router;
