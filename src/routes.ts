import express from "express";
import multer from "multer";
import csvParser from "csv-parser";
import fs from "fs";
import { Lead, Offer } from "./types";
import { storage } from "./storage";
import { runScoring } from "./scores";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

//POST: /offer
router.post("/offer", express.json(), (req, res) => {
  storage.currentOffer = req.body as Offer;
  res.status(200).json({ message: "Offer has been set" });
});

// POST /leads/upload
router.post('/leads/upload', upload.single('file'), (req, res) => {
  const leads: Lead[] = [];
  fs.createReadStream(req.file!.path)
    .pipe(csvParser())
    .on('data', (row) => {
      if (row.name && row.role && row.company && row.industry && row.location && row.linkedin_bio) {
        leads.push(row as Lead);
      } else {
        console.error("Skipping invalid row:", row);
      }
    })
    .on('end', () => {
      storage.leads = leads;
      console.log("Parsed leads:", storage.leads);
      res.status(200).send({ message: "Leads uploaded successfully" });
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

//GET /results/exports
router.get('/results/export' , (req ,res)=>{
    const csv = [
    'name,role,company,industry,location,linkedin_bio,intent,score,reasoning',
    ...storage.scoredLeads.map(lead => 
      `${lead.name},${lead.role},${lead.company},${lead.industry},${lead.location},${lead.linkedin_bio},${lead.intent},${lead.score},"${lead.reasoning}"`
    )
  ].join('\n');
  res.header('Content-Type' , 'text/csv')
  res.attachment('results.csv')
  res.send(csv)
})

export default router
