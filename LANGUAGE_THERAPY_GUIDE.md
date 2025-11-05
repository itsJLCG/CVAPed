# Language Therapy Implementation Guide

## Overview
Professional Language Therapy assessment system with Receptive and Expressive exercises integrated with Microsoft Azure for speech analysis.

## Features Implemented

### 1. **Receptive Language Exercises**
- **Vocabulary Matching:** Select correct picture for spoken word
- **Following Directions:** Point to correct shape/object
- **Sentence Comprehension:** Answer questions about sentences
- **Auto-scoring:** Immediate feedback on correctness

### 2. **Expressive Language Exercises**
- **Picture Description:** Describe visual stimuli verbally
- **Sentence Formation:** Create sentences from given words
- **Story Retelling:** Listen and retell story in own words
- **Azure Speech-to-Text:** Transcribe user's spoken response
- **Keyword Analysis:** Check for expected vocabulary usage
- **Scoring:** Based on keyword match + word count

## Azure Integration

### Speech-to-Text
- Converts user's audio recording to text
- Language: English (US)
- Real-time transcription with error handling

### Assessment Metrics
1. **Keyword Score (70% weight):** Matches expected vocabulary
2. **Word Count Score (30% weight):** Ensures sufficient response length
3. **Overall Score:** Weighted average of both metrics

### Scoring Thresholds
- 90%+: Excellent
- 70%-89%: Good
- 50%-69%: Fair
- <50%: Needs Improvement

## File Structure

### Frontend
```
frontend/src/pages/
├── LanguageTherapy.jsx        # Main component
├── LanguageTherapy.css         # Professional styling
└── SpeechTherapy.jsx           # Updated with navigation
```

### Backend
```
backend/
└── app.py                      # Added /api/language/assess-expressive endpoint
```

### Routes
```
/language-therapy               # Main language therapy page
  - Mode selection (Receptive/Expressive)
  - Exercise execution
  - Results display
```

## Exercise Data Structure

### Receptive Exercise
```javascript
{
  id: 'vocab-match',
  type: 'vocabulary',
  level: 1,
  instruction: 'Listen to the word and select the correct picture.',
  target: 'apple',
  options: [
    { id: 1, text: 'Apple', image: '🍎', correct: true },
    { id: 2, text: 'Banana', image: '🍌', correct: false },
    ...
  ]
}
```

### Expressive Exercise
```javascript
{
  id: 'picture-description',
  type: 'description',
  level: 1,
  instruction: 'Look at the picture and describe what you see.',
  prompt: '🏠🌳👨‍👩‍👧',
  expectedKeywords: ['house', 'tree', 'family', 'people', 'home'],
  minWords: 5
}
```

## Backend API Endpoint

### POST /api/language/assess-expressive
**Headers:**
- Authorization: Bearer {token}

**Body (FormData):**
- audio: Audio file (WAV format)
- exercise_id: Exercise identifier
- exercise_type: 'description', 'sentence', or 'retell'
- expected_keywords: JSON array of expected words
- min_words: Minimum expected word count

**Response:**
```json
{
  "success": true,
  "transcription": "The boy is playing with a ball.",
  "key_phrases": ["boy", "playing", "ball"],
  "word_count": 7,
  "score": 0.85,
  "feedback": "Good job! Your response was mostly complete."
}
```

## User Flow

### Receptive Language Flow
1. User selects "Receptive Language"
2. System displays instruction + options
3. User clicks correct answer
4. Immediate feedback (correct/incorrect)
5. Next exercise or view results

### Expressive Language Flow
1. User selects "Expressive Language"
2. System shows prompt (picture/words/story)
3. User records verbal response
4. Azure transcribes audio
5. System analyzes keywords + word count
6. Display feedback with score
7. Next exercise or view results

## Design Features

### Professional Styling
- Government-appropriate color scheme
- Clean, modern interface
- Accessible button sizes
- Clear visual feedback
- Responsive design (mobile-ready)

### Color Coding
- Receptive: Blue (#3b82f6)
- Expressive: Purple (#8b5cf6)
- Success: Green (#10b981)
- Warning: Orange (#f59e0b)
- Error: Red (#ef4444)

## Future Enhancements

### Potential Additions
1. **Database Storage:** Save all exercise attempts and progress
2. **Advanced Analytics:** Azure Text Analytics for sentiment, entities
3. **Progress Tracking:** Similar to articulation therapy
4. **Difficulty Levels:** Adaptive exercise difficulty
5. **Therapist Dashboard:** Review patient recordings
6. **Custom Exercises:** Therapist-created content
7. **Multi-language Support:** Support for other languages
8. **Voice Profile:** Track vocal improvements over time

### Azure Advanced Features
- **Key Phrase Extraction:** Identify main concepts
- **Entity Recognition:** Detect proper nouns, objects
- **Sentiment Analysis:** Emotional tone detection
- **Grammar Analysis:** Syntax correctness
- **Fluency Metrics:** Speech rate, pauses

## Environment Variables Required

Add to `.env` file:
```
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
```

## Testing Checklist

- [ ] Receptive exercises display correctly
- [ ] Expressive recording works
- [ ] Azure transcription accurate
- [ ] Scoring calculation correct
- [ ] Results page displays properly
- [ ] Navigation between exercises works
- [ ] Retry functionality works
- [ ] Mobile responsive design
- [ ] Audio permissions handled
- [ ] Error handling works

## Notes

- Recording auto-stops after 30 seconds
- Minimum browser: Chrome 60+, Firefox 55+, Safari 11+
- Requires microphone permissions
- Azure credentials must be configured
- Professional design matches existing pages

## Usage Instructions

1. Navigate to Speech Therapy Types
2. Click "Begin Assessment" on Language Therapy
3. Choose Receptive or Expressive mode
4. Complete exercises sequentially
5. View comprehensive results at the end
6. Retry individual exercises or start new assessment

---

**Created:** November 5, 2025  
**Status:** Ready for testing and deployment
