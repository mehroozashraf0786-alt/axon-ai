# Axon AI — Deploy in 5 Minutes

## Step 1 — Push to GitHub
1. Go to github.com → New repository → name it `axon-ai` → Create
2. Open terminal in this folder and run:
```
git init
git add .
git commit -m "Axon AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/axon-ai.git
git push -u origin main
```

## Step 2 — Deploy on Vercel
1. Go to vercel.com → sign in with GitHub
2. Click "Add New Project" → import `axon-ai` → click Deploy

## Step 3 — Add your Cerebras API Key
1. In Vercel: Project → Settings → Environment Variables
2. Add:  Name = `CEREBRAS_API_KEY`  |  Value = your key (csk-...)
3. Save → Deployments → Redeploy

## Done!
Your Nova chatbot is live at `https://axon-ai.vercel.app` (or similar)

---
Get a free Cerebras API key at: https://cloud.cerebras.ai
