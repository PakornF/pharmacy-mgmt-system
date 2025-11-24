import express from "express";
import Medicine from "/models/Medicine.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const meds = await Medicine.find();
  res.json(meds);
});

export default router;