import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LLM from './llmService';

const STORE_KEY = '@ai_irrigation_guides';

export async function getIrrigationGuides() {
  try {
    const data = await AsyncStorage.getItem(STORE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function getIrrigationGuide(cropId) {
  const guides = await getIrrigationGuides();
  return guides[cropId] || null;
}

export async function generateIrrigationGuide(crop) {
  if (!crop || !crop._id || !crop.name) return null;

  try {
    // Save a "loading" state immediately so the UI knows we're working on it
    let guides = await getIrrigationGuides();
    guides[crop._id] = { status: 'generating', text: '', cropName: crop.name, timestamp: Date.now() };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(guides));

    // Try to init model
    await LLM.initModel();

    const prompt = `Prepare a concise, practical irrigation guide for ${crop.name} in the ${crop.stage || 'Sowing'} stage. 
Include frequency, best time of day, and how to check soil moisture. Keep it under 100 words.`;

    let generatedText = '';
    
    // Call LLM
    await LLM.chat([{ role: 'user', content: prompt }], (token) => {
      generatedText += token;
    });

    if (!generatedText) {
      throw new Error('Empty response');
    }

    // Save success
    guides = await getIrrigationGuides();
    guides[crop._id] = {
      status: 'ready',
      text: generatedText.trim(),
      cropName: crop.name,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(guides));

    return guides[crop._id];

  } catch (error) {
    console.error('Failed to generate AI guide:', error);
    // Mark as failed
    const guides = await getIrrigationGuides();
    guides[crop._id] = {
      status: 'failed',
      text: 'Failed to generate guide. Please try again.',
      cropName: crop.name,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(guides));
    return null;
  }
}
