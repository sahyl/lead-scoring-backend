import express from "express";
import multer from "multer";
import csvParser from "csv-parser";
import fs from "fs";
import { Offer, Lead } from "./types.js";
import { storage } from "./storage.js";
import { runScoring } from "./scores.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

//POST: /offer
router.post("/offer", express.json(), (req, res) => {
  storage.currentOffer = req.body as Offer;
  res.status(200).json({ message: "Offer has been set" });
});

// POST /leads/upload
router.post("/leads/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  storage.leads = [];
  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on("data", (row: Lead) => storage.leads.push(row))
    .on("end", () => {
      fs.unlinkSync(req.file!.path);
      res
        .status(200)
        .json({ message: "Leads Uploaded", count: storage.leads.length });
    });
});

//POST /score

router.post("/score", async (req, res) => {
  try {
    await runScoring();
    res.status(200).json({ message: "Scoring complete" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /results

router.get("/results",(req,res)=>{
    res.status(200).json(storage.scoredLeads)
})

export default router
