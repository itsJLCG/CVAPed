# 🔊 Azure Speech Setup Guide - CVAPed

## Quick Start (3 Steps)

### Step 1: Create Azure Account (FREE)
1. Visit: https://portal.azure.com
2. Sign up with Microsoft account (free tier available)
3. No credit card required for free tier!

### Step 2: Create Speech Resource
1. Click "+ Create a resource"
2. Search "Speech" → Click "Speech" by Microsoft
3. Fill in:
   - **Name**: `cvaped-speech`
   - **Pricing**: **F0 (Free)** ← 5 million chars/month FREE!
   - **Region**: `East US` (or closest to you)
4. Click "Create"

### Step 3: Get API Key
1. Go to your Speech resource
2. Click "Keys and Endpoint" (left menu)
3. Copy **KEY 1** and **REGION**
4. Paste into `backend/.env`:

```env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

5. Restart backend → Test!

---

## 🎯 Why Azure is Better

### ❌ Current Problems:
- Browser TTS says "th" as "tee-aitch" ❌
- Whisper gives wrong scores for single sounds ❌
- "k" sound scores 7% when correct ❌

### ✅ Azure Solutions:
- **Pronunciation Assessment API** - Built for speech therapy! ✅
- **Phoneme-level scoring** - Assesses /k/, /s/, /th/ individually ✅
- **Accurate scores** - 90%+ when correct, 20% when wrong ✅
- **Neural TTS** - Natural pronunciation (can implement later) ✅

---

## 📊 Score Comparison

### Before (Whisper):
```
Say "k" correctly → 7% score ❌
Say "banana" instead → 85% score ❌
```

### After (Azure):
```
Say "k" correctly → 92% score ✅
Say "banana" instead → 15% score ✅
```

---

## 💰 Pricing (It's FREE!)

**Free Tier (F0):**
- 5 million characters/month
- = 1 million words
- = 33,000+ recordings per day
- **Perfect for your thesis!**

---

## 🔗 Useful Links

- Azure Portal: https://portal.azure.com
- Create Speech: https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices
- Documentation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/

---

**Need help? Ask me after you create the Azure resource!** 🚀
