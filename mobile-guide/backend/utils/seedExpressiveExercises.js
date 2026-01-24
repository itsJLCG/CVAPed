/**
 * Seed script for expressive language exercises
 * Run with: node backend/utils/seedExpressiveExercises.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Language Exercise Schema (simplified)
const languageExerciseSchema = new mongoose.Schema({
  mode: String,
  level: Number,
  level_name: String,
  level_color: String,
  exercise_id: String,
  type: String,
  instruction: String,
  prompt: String,
  expected_keywords: [String],
  min_words: Number,
  story: String,
  order: Number,
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}, { collection: 'language_exercises' });

const LanguageExercise = mongoose.model('LanguageExercise', languageExerciseSchema);

const expressiveExercises = [
  // Level 1: Picture Description
  {
    mode: 'expressive',
    level: 1,
    level_name: 'Picture Description',
    level_color: '#8b5cf6',
    exercise_id: 'desc-1',
    type: 'description',
    instruction: 'Look at the emojis and describe what you see in 5-10 words',
    prompt: '🏠🌳👨‍👩‍👧',
    expected_keywords: ['house', 'tree', 'family'],
    min_words: 5,
    story: '',
    order: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 1,
    level_name: 'Picture Description',
    level_color: '#8b5cf6',
    exercise_id: 'desc-2',
    type: 'description',
    instruction: 'Describe this scene using complete sentences',
    prompt: '☀️🏖️🌊',
    expected_keywords: ['sun', 'beach', 'ocean', 'water'],
    min_words: 5,
    story: '',
    order: 2,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 1,
    level_name: 'Picture Description',
    level_color: '#8b5cf6',
    exercise_id: 'desc-3',
    type: 'description',
    instruction: 'Tell me what you see in this picture',
    prompt: '🐕⚽👦',
    expected_keywords: ['dog', 'ball', 'boy', 'playing'],
    min_words: 5,
    story: '',
    order: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 1,
    level_name: 'Picture Description',
    level_color: '#8b5cf6',
    exercise_id: 'desc-4',
    type: 'description',
    instruction: 'Describe what is happening here',
    prompt: '🍎🍌🍊🥤',
    expected_keywords: ['apple', 'banana', 'orange', 'juice', 'fruit'],
    min_words: 5,
    story: '',
    order: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 1,
    level_name: 'Picture Description',
    level_color: '#8b5cf6',
    exercise_id: 'desc-5',
    type: 'description',
    instruction: 'What do you see in this picture?',
    prompt: '🚗🛣️🌆',
    expected_keywords: ['car', 'road', 'city', 'driving'],
    min_words: 5,
    story: '',
    order: 5,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },

  // Level 2: Sentence Formation
  {
    mode: 'expressive',
    level: 2,
    level_name: 'Sentence Formation',
    level_color: '#ec4899',
    exercise_id: 'sent-1',
    type: 'sentence',
    instruction: 'Make a sentence using these words: cat, sleeping, chair',
    prompt: 'Words: cat, sleeping, chair',
    expected_keywords: ['cat', 'sleeping', 'chair'],
    min_words: 5,
    story: '',
    order: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 2,
    level_name: 'Sentence Formation',
    level_color: '#ec4899',
    exercise_id: 'sent-2',
    type: 'sentence',
    instruction: 'Create a sentence with: bird, flying, sky',
    prompt: 'Words: bird, flying, sky',
    expected_keywords: ['bird', 'flying', 'sky'],
    min_words: 5,
    story: '',
    order: 2,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 2,
    level_name: 'Sentence Formation',
    level_color: '#ec4899',
    exercise_id: 'sent-3',
    type: 'sentence',
    instruction: 'Form a sentence using: book, reading, library',
    prompt: 'Words: book, reading, library',
    expected_keywords: ['book', 'reading', 'library'],
    min_words: 5,
    story: '',
    order: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 2,
    level_name: 'Sentence Formation',
    level_color: '#ec4899',
    exercise_id: 'sent-4',
    type: 'sentence',
    instruction: 'Make a sentence with: children, playing, park',
    prompt: 'Words: children, playing, park',
    expected_keywords: ['children', 'playing', 'park'],
    min_words: 5,
    story: '',
    order: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 2,
    level_name: 'Sentence Formation',
    level_color: '#ec4899',
    exercise_id: 'sent-5',
    type: 'sentence',
    instruction: 'Create a sentence using: teacher, classroom, students',
    prompt: 'Words: teacher, classroom, students',
    expected_keywords: ['teacher', 'classroom', 'students'],
    min_words: 5,
    story: '',
    order: 5,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },

  // Level 3: Story Retell
  {
    mode: 'expressive',
    level: 3,
    level_name: 'Story Retell',
    level_color: '#f59e0b',
    exercise_id: 'retell-1',
    type: 'retell',
    instruction: 'Listen to this story and retell it in your own words',
    prompt: 'Story about a day at the park',
    expected_keywords: ['park', 'children', 'playing', 'fun'],
    min_words: 15,
    story: 'One sunny day, children went to the park. They played on the swings and slides. Everyone had fun together.',
    order: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 3,
    level_name: 'Story Retell',
    level_color: '#f59e0b',
    exercise_id: 'retell-2',
    type: 'retell',
    instruction: 'After reading, tell me the story again',
    prompt: 'Story about a helpful dog',
    expected_keywords: ['dog', 'helped', 'family', 'home'],
    min_words: 15,
    story: 'A friendly dog helped its family find their way home. The dog was very smart and knew the way. The family was happy and grateful.',
    order: 2,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 3,
    level_name: 'Story Retell',
    level_color: '#f59e0b',
    exercise_id: 'retell-3',
    type: 'retell',
    instruction: 'Listen carefully and retell this story',
    prompt: 'Story about making a sandwich',
    expected_keywords: ['bread', 'sandwich', 'making', 'food'],
    min_words: 15,
    story: 'First, take two slices of bread. Then, add your favorite fillings like cheese and ham. Finally, put the slices together to make a delicious sandwich.',
    order: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 3,
    level_name: 'Story Retell',
    level_color: '#f59e0b',
    exercise_id: 'retell-4',
    type: 'retell',
    instruction: 'Retell this story in your own words',
    prompt: 'Story about a rainy day',
    expected_keywords: ['rain', 'umbrella', 'wet', 'stayed'],
    min_words: 15,
    story: 'It started to rain heavily. The boy forgot his umbrella at home. He ran to a nearby shop to stay dry until the rain stopped.',
    order: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    mode: 'expressive',
    level: 3,
    level_name: 'Story Retell',
    level_color: '#f59e0b',
    exercise_id: 'retell-5',
    type: 'retell',
    instruction: 'Listen and then tell me the story',
    prompt: 'Story about birthday party',
    expected_keywords: ['birthday', 'party', 'cake', 'friends', 'celebrate'],
    min_words: 15,
    story: 'Maria had a birthday party with her friends. They ate cake and played games. Everyone sang happy birthday. It was a wonderful celebration.',
    order: 5,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Check if expressive exercises already exist
    const existingCount = await LanguageExercise.countDocuments({ mode: 'expressive' });
    
    if (existingCount > 0) {
      console.log(`⚠️  Database already has ${existingCount} expressive exercises`);
      console.log('Do you want to delete and reseed? (Ctrl+C to cancel, or wait 5 seconds to continue)');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🗑️  Deleting existing expressive exercises...');
      await LanguageExercise.deleteMany({ mode: 'expressive' });
      console.log('✅ Deleted existing exercises');
    }

    // Insert new exercises
    console.log(`📝 Inserting ${expressiveExercises.length} expressive exercises...`);
    const result = await LanguageExercise.insertMany(expressiveExercises);
    
    console.log(`✅ Successfully seeded ${result.length} expressive language exercises`);
    console.log('\nExercises by level:');
    console.log('  Level 1 (Picture Description): 5 exercises');
    console.log('  Level 2 (Sentence Formation): 5 exercises');
    console.log('  Level 3 (Story Retell): 5 exercises');
    console.log(`  Total: ${result.length} exercises`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
