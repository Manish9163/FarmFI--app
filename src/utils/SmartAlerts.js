// Notification stub — expo-notifications removed (not supported in Expo Go SDK 53+)
// When you switch to a development build, re-add expo-notifications for real push support.
const safeScheduleNotification = async ({ content, trigger }) => {
  console.log(`[Notification] ${content.title}: ${content.body}`);
};


const CROP_DATABASE = {
  wheat: { name: 'Wheat', fertilizer_days: 20, pesticide_days: 45, harvest_days: 120 },
  rice: { name: 'Rice', fertilizer_days: 15, pesticide_days: 40, harvest_days: 140 },
  corn: { name: 'Corn', fertilizer_days: 25, pesticide_days: 50, harvest_days: 90 },
  barley: { name: 'Barley', fertilizer_days: 20, pesticide_days: 35, harvest_days: 90 },
  millet: { name: 'Millet', fertilizer_days: 15, pesticide_days: 30, harvest_days: 75 },
  sorghum: { name: 'Sorghum', fertilizer_days: 20, pesticide_days: 40, harvest_days: 100 },
  soybean: { name: 'Soybean', fertilizer_days: 25, pesticide_days: 45, harvest_days: 110 },
  cotton: { name: 'Cotton', fertilizer_days: 30, pesticide_days: 60, harvest_days: 150 },
  sugarcane: { name: 'Sugarcane', fertilizer_days: 45, pesticide_days: 90, harvest_days: 65 },
  peanut: { name: 'Peanut', fertilizer_days: 20, pesticide_days: 40, harvest_days: 130 },
  sunflower: { name: 'Sunflower', fertilizer_days: 25, pesticide_days: 45, harvest_days: 120 },
  mustard: { name: 'Mustard', fertilizer_days: 15, pesticide_days: 30, harvest_days: 85 },
  potato: { name: 'Potato', fertilizer_days: 20, pesticide_days: 40, harvest_days: 90 },
  tomato: { name: 'Tomato', fertilizer_days: 15, pesticide_days: 35, harvest_days: 75 },
  onion: { name: 'Onion', fertilizer_days: 25, pesticide_days: 50, harvest_days: 110 },
  cabbage: { name: 'Cabbage', fertilizer_days: 15, pesticide_days: 30, harvest_days: 80 },
  carrot: { name: 'Carrot', fertilizer_days: 20, pesticide_days: 40, harvest_days: 75 },
  spinach: { name: 'Spinach', fertilizer_days: 10, pesticide_days: 20, harvest_days: 45 },
  garlic: { name: 'Garlic', fertilizer_days: 30, pesticide_days: 60, harvest_days: 150 },
  chickpea: { name: 'Chickpea', fertilizer_days: 20, pesticide_days: 45, harvest_days: 100 },
  lentil: { name: 'Lentil', fertilizer_days: 15, pesticide_days: 35, harvest_days: 90 },
  peas: { name: 'Peas', fertilizer_days: 15, pesticide_days: 30, harvest_days: 65 }
};

export const evaluateClimateAlerts = async (forecastArray) => {
  if (!forecastArray || forecastArray.length < 2) return;
  
  const tomorrow = forecastArray[1];
  
  if (tomorrow.max_temp >= 38) {
    await safeScheduleNotification({
      content: {
        title: "🔥 Smart Alert: Kal Bohot Garmi Hogi",
        body: `Temperatures kal ${tomorrow.max_temp}°C tak ja sakti hai. Apne kheto me zyada paani dein aur sensitive fasalon ko bachayein.`,
        sound: true,
      },
      trigger: { type: 'timeInterval', seconds: 5, repeats: false },
    });
  } else if (tomorrow.chance_of_rain > 70) {
    await safeScheduleNotification({
      content: {
        title: "🌧️ Smart Alert: Bhari Baarish Ka Alert",
        body: `Kal baarish hone ke ${tomorrow.chance_of_rain}% chances hain. Fertilizer mat lagayein warna paani ke sath beh jayega.`,
        sound: true,
      },
      trigger: { type: 'timeInterval', seconds: 5, repeats: false },
    });
  } else if (tomorrow.min_temp <= 5) {
    await safeScheduleNotification({
      content: {
        title: "❄️ Smart Alert: Thand Padhne Ka Khatra",
        body: `Kal raat temperature ${tomorrow.min_temp}°C tak jaa sakta hain. Fasal ko thand se bachane ka intezam karein.`,
        sound: true,
      },
      trigger: { type: 'timeInterval', seconds: 5, repeats: false },
    });
  }
};

export const registerCropCycle = async (cropKey) => {
  const crop = CROP_DATABASE[cropKey.toLowerCase()];
  if (!crop) return;

  // 1. Fertilizer Alert
  await safeScheduleNotification({
    content: {
      title: `🌱 Protocol: ${crop.name} Mein Khad Daalein`,
      body: `Aapko fasal lagaye hue ${crop.fertilizer_days} din ho gaye hain. Abhi ${crop.fertilizer_type} fertilizer apply karne ka best time hai.`,
      sound: true,
    },
    trigger: { type: 'timeInterval', seconds: 15, repeats: false },
  });

  // 2. Pesticide Alert
  await safeScheduleNotification({
    content: {
      title: `🛡️ Protocol: ${crop.name} Pe Dawai Chhidkein`,
      body: `${crop.pesticide_days} din pooray ho gaye hain. Kheto par ${crop.pesticide_type} pesticides spray karein taaki bimari na faile.`,
      sound: true,
    },
    trigger: { type: 'timeInterval', seconds: 30, repeats: false },
  });

  // 3. Harvest Alert
  await safeScheduleNotification({
    content: {
      title: `🌾 Protocol: ${crop.name} Ki Katai Ka Waqt!`,
      body: `Aapki fasal 5 din mein poori mature ho jayegi (Day ${crop.harvest_days}). Mazdoor aur transport ka intezam jaldi shuru kardein.`,
      sound: true,
    },
    trigger: { type: 'timeInterval', seconds: 45, repeats: false },
  });
};
