import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Droplets, Sun, Scissors, Tractor, Sprout, Wind, ShieldAlert, Activity, Leaf } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Master configuration for crop cycles + care guides (Massively expanded)
const CROP_CYCLES = {
  // Existing 6
  Wheat: {
    theme: '#f59e0b', months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], sowStart: 0, sowEnd: 1, harvestStart: 5, harvestEnd: 6,
    phases: [
      { title: 'Land Prep', days: 'Day 0-15', desc: 'Plough field 2-3 times. Apply basal NPK dose.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 16-25', desc: 'Sow treated seeds. Space rows 20cm apart.', Icon: Sprout },
      { title: 'CRI Stage Irrigation', days: 'Day 26-45', desc: 'Critical root initiation. Must water heavily.', Icon: Droplets },
      { title: 'Grain Filling', days: 'Day 90-120', desc: 'Avoid heat stress. Keep soil moderately moist.', Icon: Sun },
      { title: 'Harvest', days: 'Day 130-150', desc: 'Harvest when grain moisture drops below 15%.', Icon: Scissors },
    ],
    care: { water: 'Requires 4-6 irrigations. Critical at CRI and Flowering.', sunlight: 'Full direct sunlight (minimum 6-8 hours daily).', soil: 'Well-drained loamy to clay loam soil (pH 6.0-7.5).', pest: 'Watch for Termites early and Rusts (yellow/brown) during growth phase.' }
  },
  Tomato: {
    theme: '#ef4444', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], sowStart: 1, sowEnd: 2, harvestStart: 4, harvestEnd: 6,
    phases: [
      { title: 'Nursery Prep', days: 'Day 0-30', desc: 'Raise seedlings in shaded beds before transplant.', Icon: Sprout },
      { title: 'Transplantation', days: 'Day 31-35', desc: 'Move to main field with 60x60cm spacing.', Icon: Tractor },
      { title: 'Vegetative Growth', days: 'Day 36-60', desc: 'Frequent light irrigation. Stake the plants.', Icon: Wind },
      { title: 'Flowering & Fruiting', days: 'Day 61-90', desc: 'Apply potash. Ensure consistent watering.', Icon: Droplets },
      { title: 'Staggered Harvest', days: 'Day 91-150', desc: 'Pick red ripe fruits every 3-4 days.', Icon: Scissors },
    ],
    care: { water: 'Consistent moderate watering. Avoid overhead watering to prevent blight.', sunlight: 'Needs full sun (7+ hours/day).', soil: 'Sandy loam (pH 6.0-7.0) with high organic matter.', pest: 'Highly susceptible to Late Blight, Whiteflies, and Fruit Borers.' }
  },
  Rice: {
    theme: '#3b82f6', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], sowStart: 0, sowEnd: 1, harvestStart: 4, harvestEnd: 5,
    phases: [
      { title: 'Puddling', days: 'Day 0-15', desc: 'Flood the field and puddle to destroy weeds.', Icon: Droplets },
      { title: 'Transplanting', days: 'Day 20-25', desc: 'Plant 2-3 seedlings per hill in shallow water.', Icon: Sprout },
      { title: 'Tillering', days: 'Day 26-60', desc: 'Maintain 5cm standing water. Apply top-dress N.', Icon: Droplets },
      { title: 'Panicle Initiation', days: 'Day 61-100', desc: 'Critical water requirement stage. Do not let soil dry.', Icon: Wind },
      { title: 'Ripening & Harvest', days: 'Day 110-140', desc: 'Drain water 10 days before harvest.', Icon: Scissors },
    ],
    care: { water: 'Extremely high (Requires continuous standing water 2-5cm deep).', sunlight: 'Requires bright, hot direct sun.', soil: 'Heavy clay or clay-loam that holds water (pH 5.5-6.5).', pest: 'Protect against Stem Borers and Brown Plant Hoppers.' }
  },
  Potato: {
    theme: '#d97706', months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'], sowStart: 1, sowEnd: 2, harvestStart: 4, harvestEnd: 5,
    phases: [
      { title: 'Tuber Prep', days: 'Day 0-10', desc: 'Cut tubers to size, ensuring 2-3 eyes per piece.', Icon: Tractor },
      { title: 'Planting', days: 'Day 11-15', desc: 'Plant in well-aerated ridges (60cm apart).', Icon: Sprout },
      { title: 'Earthing Up', days: 'Day 25-35', desc: 'Cover stems with soil to protect expanding tubers.', Icon: ShieldAlert },
      { title: 'Tuber Bulking', days: 'Day 40-75', desc: 'Keep moisture stable. Apply specific K-fertilizers.', Icon: Droplets },
      { title: 'Haulm Cutting & Harvest', days: 'Day 80-110', desc: 'Cut green tops 10 days prior to digging.', Icon: Scissors },
    ],
    care: { water: 'Keep soil moist but not soggy to prevent tubers rotting.', sunlight: 'Prefers full sun, cooler climate.', soil: 'Loose, friable sandy-loam (pH 5.0-6.0) to allow tuber expansion.', pest: 'Highly vulnerable to Late Blight and Aphids.' }
  },
  Cotton: {
    theme: '#f1f5f9', months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], sowStart: 0, sowEnd: 1, harvestStart: 5, harvestEnd: 6,
    phases: [
      { title: 'Deep Ploughing', days: 'Day 0-15', desc: 'Deep till to assist tap root penetration.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 16-25', desc: 'Dibble seeds at exact spacing (90x60cm).', Icon: Sprout },
      { title: 'Square Formation', days: 'Day 45-60', desc: 'Critical stage. Implement integrated pest management.', Icon: ShieldAlert },
      { title: 'Boll Development', days: 'Day 80-110', desc: 'Maintain moisture. Protect from bollworms.', Icon: Droplets },
      { title: 'Defoliation & Picking', days: 'Day 130-160', desc: 'Pick fully open bolls sequentially in multiple passes.', Icon: Scissors },
    ],
    care: { water: 'Moderate. Withstand dry spells but critical during flowering.', sunlight: 'Needs entirely clear, hot sunny days.', soil: 'Deep black soil or alluvial soils (pH 6.0-8.0).', pest: 'Major threat is Pink Bollworm and Whitefly. Requires high pest vigilance.' }
  },
  Sugarcane: {
    theme: '#22c55e', months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], sowStart: 0, sowEnd: 1, harvestStart: 10, harvestEnd: 11,
    phases: [
      { title: 'Sett Planting', days: 'Day 0-20', desc: 'Treat sets with fungicide. Plant end-to-end in deep furrows.', Icon: Sprout },
      { title: 'Germination', days: 'Day 21-45', desc: 'Provide light irrigations. Ensure weed-free field.', Icon: Droplets },
      { title: 'Tillering', days: 'Day 60-120', desc: 'First top dressing of Nitrogen. Earthing up.', Icon: Tractor },
      { title: 'Grand Growth', days: 'Day 130-250', desc: 'Maximum water/nutrient demand. Tie up tall canes.', Icon: Activity },
      { title: 'Maturity & Harvest', days: 'Day 300-360', desc: 'Stop irrigation 15 days prior. Harvest at base.', Icon: Scissors },
    ],
    care: { water: 'High requirement over 12 solid months.', sunlight: 'Needs huge amounts of radiant energy (hot, sunny conditions).', soil: 'Well drained rich loamy soils (pH 6.5-7.5).', pest: 'Shoot borers and Red Rot fungus. Treat seeds before sowing!' }
  },

  // Newly Added 15 Crops
  Maize: {
    theme: '#fbbf24', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Land Prep', days: 'Day 0-10', desc: 'Plough deeply to break hardpan.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 11-15', desc: 'Sow at uniform depth. Apply basal Zinc.', Icon: Sprout },
      { title: 'Knee High Stage', days: 'Day 25-40', desc: 'Top dress Nitrogen. Earth up plant rows.', Icon: Leaf },
      { title: 'Tasseling & Silking', days: 'Day 50-70', desc: 'Crucial irrigation period to prevent barren cobs.', Icon: Droplets },
      { title: 'Harvesting', days: 'Day 90-110', desc: 'Harvest when husks turn dry brown.', Icon: Scissors }
    ],
    care: { water: 'Heavy during silking, otherwise moderate.', sunlight: 'Full sunlight needed for rapid growth.', soil: 'Well drained loamy soil.', pest: 'Fall Armyworm is the main threat.' }
  },
  Onion: {
    theme: '#c084fc', months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], sowStart: 0, sowEnd: 1, harvestStart: 5, harvestEnd: 6,
    phases: [
      { title: 'Nursery', days: 'Day 0-30', desc: 'Sow seeds in raised nursery beds.', Icon: Sprout },
      { title: 'Transplantation', days: 'Day 35-45', desc: 'Transplant seedlings at 15x10cm spacing.', Icon: Tractor },
      { title: 'Vegetative Growth', days: 'Day 46-80', desc: 'Apply frequent light irrigation. Weed management.', Icon: Droplets },
      { title: 'Bulb Formation', days: 'Day 81-120', desc: 'Apply Sulphur to improve bulb pungency.', Icon: Activity },
      { title: 'Curing & Harvest', days: 'Day 130-150', desc: 'Stop watering. Harvest when 50% tops fall over.', Icon: Scissors }
    ],
    care: { water: 'Frequent, shallow watering. Stop before harvest.', sunlight: 'Needs full sun for bulb expansion.', soil: 'Loose sandy-loam.', pest: 'Thrips and Purple Blotch disease.' }
  },
  Soybean: {
    theme: '#a3e635', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Seed Treatment', days: 'Day 0-5', desc: 'Inoculate with Rhizobium culture.', Icon: ShieldAlert },
      { title: 'Sowing', days: 'Day 6-10', desc: 'Sow at 3-4cm depth immediately after rain.', Icon: Sprout },
      { title: 'Flowering', days: 'Day 35-45', desc: 'Critical moisture window. High nutrient uptake.', Icon: Droplets },
      { title: 'Pod Formation', days: 'Day 50-80', desc: 'Spray micronutrients. Monitor for caterpillars.', Icon: Leaf },
      { title: 'Reaping', days: 'Day 90-110', desc: 'Harvest when pods turn brown and crackle.', Icon: Scissors }
    ],
    care: { water: 'Rainfed mostly, but needs water during pod filling.', sunlight: 'Full sun required.', soil: 'Well drained clay-loam.', pest: 'Whitefly and Girdle Beetle.' }
  },
  Carrot: {
    theme: '#f97316', months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Deep Tilling', days: 'Day 0-10', desc: 'Till very deeply to allow straight taproots.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 11-15', desc: 'Scatter ultra-light seeds mixed with sand.', Icon: Sprout },
      { title: 'Thinning', days: 'Day 30-40', desc: 'Remove excess seedlings to avoid root tangling.', Icon: Scissors },
      { title: 'Root Bulking', days: 'Day 50-80', desc: 'Ensure consistent moisture to prevent root splitting.', Icon: Droplets },
      { title: 'Uprooting', days: 'Day 90-110', desc: 'Pull roots out when they reach desired color/girth.', Icon: Activity }
    ],
    care: { water: 'Continuous, even moisture to prevent cracking.', sunlight: 'Full sun to partial shade.', soil: 'Extremely loose, stone-free deep loam.', pest: 'Carrot rust fly and Nematodes.' }
  },
  Cabbage: {
    theme: '#4ade80', months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Nursery', days: 'Day 0-25', desc: 'Raise seedlings under protective netting.', Icon: Sprout },
      { title: 'Field Planting', days: 'Day 26-30', desc: 'Transplant on ridges.', Icon: Tractor },
      { title: 'Leaf Formation', days: 'Day 31-60', desc: 'High nitrogen demand. Regular weeding.', Icon: Leaf },
      { title: 'Head Formation', days: 'Day 61-90', desc: 'Critical irrigation. Use targeted pest control.', Icon: ShieldAlert },
      { title: 'Harvesting', days: 'Day 91-110', desc: 'Cut base when head is firm and solid.', Icon: Scissors }
    ],
    care: { water: 'Heavy water consumer. Never let soil dry deeply.', sunlight: 'Cool weather, full sun.', soil: 'Rich, moist loamy clay.', pest: 'Diamondback Moth is devastating here.' }
  },
  Chili: {
    theme: '#ef4444', months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'], sowStart: 0, sowEnd: 0, harvestStart: 4, harvestEnd: 6,
    phases: [
      { title: 'Nursery Prep', days: 'Day 0-35', desc: 'Sow seeds in pro-trays and nurture indoors.', Icon: Sprout },
      { title: 'Transplantation', days: 'Day 36-40', desc: 'Move to main field with 60x45cm spacing.', Icon: Tractor },
      { title: 'Branching', days: 'Day 41-70', desc: 'Pinch top shoots to encourage branching.', Icon: Wind },
      { title: 'Flowering & Fruiting', days: 'Day 71-100', desc: 'Watch for flower drop. Maintain K and Ca.', Icon: Activity },
      { title: 'Successive Picking', days: 'Day 101-180', desc: 'Pick green or wait for red ripening.', Icon: Scissors }
    ],
    care: { water: 'Moderate. Cannot withstand waterlogging.', sunlight: 'Extremely high direct sunlight.', soil: 'Well-draining silty loam.', pest: 'Thrips, Mites, and Fruit Rot.' }
  },
  Garlic: {
    theme: '#e2e8f0', months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], sowStart: 0, sowEnd: 0, harvestStart: 4, harvestEnd: 5,
    phases: [
      { title: 'Clove Separation', days: 'Day 0-5', desc: 'Separate cloves carefully without peeling.', Icon: Activity },
      { title: 'Planting', days: 'Day 6-10', desc: 'Plant at 5cm depth, pointy side up.', Icon: Sprout },
      { title: 'Green Scape Growth', days: 'Day 30-80', desc: 'Mulch heavily. Manage weeds actively.', Icon: Leaf },
      { title: 'Bulb Expansion', days: 'Day 81-120', desc: 'Stop watering 15 days before harvest.', Icon: Droplets },
      { title: 'Curing', days: 'Day 125-140', desc: 'Uproot and dry in the shade to seal the paper skins.', Icon: Wind }
    ],
    care: { water: 'Moderate early on, completely dry near harvest.', sunlight: 'Full sun required.', soil: 'Sandy loam rich in organic matter.', pest: 'Onion Maggot and Purple Blotch.' }
  },
  Sunflower: {
    theme: '#fde047', months: ['Feb', 'Mar', 'Apr', 'May', 'Jun'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Field Tillage', days: 'Day 0-10', desc: 'Till moderately. Add Zinc sulfate.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 11-15', desc: 'Sow at 4-5cm depth in rows.', Icon: Sprout },
      { title: 'Bud Stage', days: 'Day 40-50', desc: 'Crucial irrigation to boost head size.', Icon: Droplets },
      { title: 'Bloom', days: 'Day 60-80', desc: 'Attract bees for maximum pollination.', Icon: Sun },
      { title: 'Maturity & Harvest', days: 'Day 90-110', desc: 'Cut flower heads when back turns lemon-yellow.', Icon: Scissors }
    ],
    care: { water: 'Drought tolerant but responds heavily to water at bud stage.', sunlight: 'Absolute full sun (heliotropic).', soil: 'Light to heavy but well-drained.', pest: 'Protect from Parrots and Head Borer.' }
  },
  Mango: {
    theme: '#fcd34d', months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], sowStart: 0, sowEnd: 1, harvestStart: 6, harvestEnd: 8, // Yearly representation
    phases: [
      { title: 'Pit Digging', days: 'Year 0', desc: 'Dig 1x1x1m pit. Wait 15 days before planting graft.', Icon: Tractor },
      { title: 'Sapling Care', days: 'Year 1-3', desc: 'Formative pruning and heavy wind protection.', Icon: Wind },
      { title: 'Pre-Flowering', days: 'Year 4+', desc: 'Apply fertilizer in trench around canopy drip line.', Icon: Droplets },
      { title: 'Fruit Set', days: 'Year 4+ (Spring)', desc: 'Protect from mango hopper and powdery mildew.', Icon: ShieldAlert },
      { title: 'Plucking', days: 'Year 4+ (Summer)', desc: 'Pluck with stalk attached to prevent sap burn.', Icon: Scissors }
    ],
    care: { water: 'Critical for young trees. Mature trees are highly drought tolerant.', sunlight: 'A massive sun requirements.', soil: 'Deep laterite or alluvial soil.', pest: 'Mango Hopper and Fruit Fly.' }
  },
  Papaya: {
    theme: '#fcd34d', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'], sowStart: 0, sowEnd: 1, harvestStart: 6, harvestEnd: 8,
    phases: [
      { title: 'Nursery', days: 'Day 0-45', desc: 'Sow in polythene bags under protective net.', Icon: Sprout },
      { title: 'Planting', days: 'Day 46-50', desc: 'Plant firmly on raised mounds to avoid waterlogging.', Icon: Tractor },
      { title: 'Sex Identification', days: 'Day 120-130', desc: 'Remove excess male plants leaving 1 male per 10 females.', Icon: Scissors },
      { title: 'Fletching', days: 'Day 150-200', desc: 'Ensure daily micro-irrigation.', Icon: Droplets },
      { title: 'Harvesting', days: 'Day 220-300', desc: 'Pick fruit when skin shows first signs of yellow apex.', Icon: Activity }
    ],
    care: { water: 'Needs frequent light watering. Cannot tolerate standing water.', sunlight: 'Full warm sun.', soil: 'Sandy/silty highly draining soil.', pest: 'Papaya Ringspot Virus is fatal.' }
  },
  Coffee: {
    theme: '#78350f', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], sowStart: 0, sowEnd: 1, harvestStart: 5, harvestEnd: 6, // Generic Cycle
    phases: [
      { title: 'Shade Setup', days: 'Year 0', desc: 'Plant shade trees (Silver Oak) 1 year prior.', Icon: Sun },
      { title: 'Transplantation', days: 'Year 1', desc: 'Plant coffee saplings in pits during monsoon.', Icon: Sprout },
      { title: 'Bush Management', days: 'Year 2-3', desc: 'Centering and Desuckering. Maintain single stem.', Icon: Scissors },
      { title: 'Berry Development', days: 'Year 4+', desc: 'Crucial Blossom Showers for flowering.', Icon: Droplets },
      { title: 'Cherry Picking', days: 'Year 4+ (Winter)', desc: 'Handpick selectively only red ripe cherries.', Icon: Activity }
    ],
    care: { water: 'Requires steady rainfall and crucial blossom showers.', sunlight: 'Requires 50% filtered shade.', soil: 'Deep, slightly acidic forest soil.', pest: 'Coffee Berry Borer and Leaf Rust.' }
  },
  Tea: {
    theme: '#166534', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], sowStart: 0, sowEnd: 1, harvestStart: 3, harvestEnd: 11, // Plucked year round
    phases: [
      { title: 'Nursery Clones', days: 'Year 0-1', desc: 'Raise clones in sleeves for 12 months.', Icon: Sprout },
      { title: 'Trenching', days: 'Year 1', desc: 'Plant in deep trenches across the contour.', Icon: Tractor },
      { title: 'Formative Pruning', days: 'Year 2-3', desc: 'Centering frame spread to develop plucking table.', Icon: Scissors },
      { title: 'Maintenance', days: 'Year 4+', desc: 'Apply high nitrogen doses routinely.', Icon: Droplets },
      { title: 'Plucking', days: 'Year 4+', desc: 'Pluck "Two leaves and a bud" every 7-14 days.', Icon: Leaf }
    ],
    care: { water: 'Extremely high rainfall required but NO waterlogging.', sunlight: 'Likes misty, warm diffuse sunlight.', soil: 'Highly acidic (pH 4.5-5.5) sloping soils.', pest: 'Tea Mosquito Bug and Red Spider Mite.' }
  },
  Groundnut: {
    theme: '#d97706', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], sowStart: 0, sowEnd: 0, harvestStart: 3, harvestEnd: 4,
    phases: [
      { title: 'Soil Loosening', days: 'Day 0-10', desc: 'Plough deeply and apply Gypsum for shell formation.', Icon: Tractor },
      { title: 'Sowing', days: 'Day 11-15', desc: 'Sow kernel seeds with seed drill.', Icon: Sprout },
      { title: 'Pegging', days: 'Day 45-60', desc: 'Do NOT disturb soil during peg penetration into ground.', Icon: ShieldAlert },
      { title: 'Pod Development', days: 'Day 61-90', desc: 'Maintain moisture strictly at pod filling stage.', Icon: Droplets },
      { title: 'Digging', days: 'Day 100-110', desc: 'Uproot entire plant and dry under sun.', Icon: Activity }
    ],
    care: { water: 'Moderate. Wet-dry cycles are beneficial until pegging.', sunlight: 'Full direct sunlight.', soil: 'Extremely loose, light sandy loams (vital for pegging).', pest: 'White Grub and Tikka disease.' }
  },
  Banana: {
    theme: '#fde047', months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'], sowStart: 0, sowEnd: 1, harvestStart: 7, harvestEnd: 8,
    phases: [
      { title: 'Sucker Prep', days: 'Day 0-10', desc: 'Select healthy sword suckers. Pare and treat roots.', Icon: Scissors },
      { title: 'Pit Planting', days: 'Day 11-20', desc: 'Plant in heavily manured deep pits.', Icon: Tractor },
      { title: 'Vegetative Phase', days: 'Day 30-150', desc: 'Huge water and Nitrogen requirements.', Icon: Droplets },
      { title: 'Shooting & Bunch Tending', days: 'Day 200-250', desc: 'Propping the stem. Protect bunch from direct sun.', Icon: ShieldAlert },
      { title: 'Harvesting', days: 'Day 280-320', desc: 'Harvest when ridges on fruits become rounded.', Icon: Activity }
    ],
    care: { water: 'Enormous water requirements continuously.', sunlight: 'Full sunlight and high humidity.', soil: 'Deep, rich, high organic matter.', pest: 'Rhizome Weevil and Panama Wilt.' }
  },
  Apple: {
    theme: '#ef4444', months: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], sowStart: 0, sowEnd: 1, harvestStart: 8, harvestEnd: 9, // Winter plant, Autumn harvest
    phases: [
      { title: 'Dormant Planting', days: 'Year 0 (Winter)', desc: 'Plant rootstock during full winter dormancy.', Icon: Tractor },
      { title: 'Training & Pruning', days: 'Year 1-3', desc: 'Develop modified central leader canopy structure.', Icon: Scissors },
      { title: 'Winter Chilling', days: 'Every Winter', desc: 'Requires 1000+ chill hours to break dormancy.', Icon: Wind },
      { title: 'Spring Bloom', days: 'Spring', desc: 'Attract bees for cross-pollination. Stop chemical sprays.', Icon: Sun },
      { title: 'Autumn Harvest', days: 'Late Summer', desc: 'Harvest when ground color changes from green to yellow/red.', Icon: Activity }
    ],
    care: { water: 'Continuous moderate drip irrigation during fruit set.', sunlight: 'Needs cool climates with extremely bright sunny days.', soil: 'Well drained loamy soil in slope structures.', pest: 'Apple Scab and San Jose Scale.' }
  }
};

const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PlantingCalendarScreen({ navigation }) {
  const [activeCrop, setActiveCrop] = useState('Wheat');
  const cycle = CROP_CYCLES[activeCrop];

  // Helper to render the timeline UI structurally
  const renderTimelineMonth = (monthName, index) => {
    // Determine if this month is Sow, Harvest, or Growing based on the crop's array index
    const cropMonthIdx = cycle.months.indexOf(monthName);
    
    let statusColor = 'rgba(255,255,255,0.05)';
    let statusText = '';
    
    if (cropMonthIdx !== -1) {
      if (cropMonthIdx >= cycle.sowStart && cropMonthIdx <= cycle.sowEnd) {
        statusColor = 'rgba(16, 185, 129, 0.2)'; // Green for Sowing
        statusText = 'Sow';
      } else if (cropMonthIdx >= cycle.harvestStart && cropMonthIdx <= cycle.harvestEnd) {
        statusColor = 'rgba(245, 158, 11, 0.2)'; // Orange for Harvest
        statusText = 'Harvest';
      } else {
        statusColor = 'rgba(59, 130, 246, 0.15)'; // Blue for Growing
        statusText = 'Grow';
      }
    }

    return (
      <View key={monthName} style={styles.monthBox}>
        <Text style={[styles.monthLabel, { color: cropMonthIdx !== -1 ? '#fff' : '#64748b' }]}>{monthName}</Text>
        <View style={[styles.monthBar, { backgroundColor: statusColor }]}>
          {statusText ? (
            <Text style={[styles.statusText, { 
              color: statusText === 'Sow' ? '#10b981' : statusText === 'Harvest' ? '#f59e0b' : '#3b82f6' 
            }]}>{statusText}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Planting Calendar</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionHeader}>1. Select Crop Cycle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropSelector}>
          {Object.keys(CROP_CYCLES).map(c => (
            <TouchableOpacity 
              key={c} 
              style={[
                styles.cropPill, 
                activeCrop === c && { backgroundColor: CROP_CYCLES[c].theme, borderColor: CROP_CYCLES[c].theme }
              ]} 
              onPress={() => setActiveCrop(c)}
            >
              <Text style={[
                styles.cropText, 
                activeCrop === c && { color: ['Cotton','Garlic','Sunflower','Mango','Papaya','Banana'].includes(c) ? '#0f172a' : '#fff', fontWeight: '800' }
              ]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionHeader}>2. Annual Timeline</Text>
        <View style={styles.timelineCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
             {ALL_MONTHS.map((m, i) => renderTimelineMonth(m, i))}
          </ScrollView>
          <View style={styles.legendRow}>
             <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#10b981'}]} /><Text style={styles.legendText}>Sowing</Text></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#3b82f6'}]} /><Text style={styles.legendText}>Growing</Text></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#f59e0b'}]} /><Text style={styles.legendText}>Harvesting</Text></View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>3. Detailed Growth Phases</Text>
        {cycle.phases.map((phase, index) => {
          const PhaseIcon = phase.Icon;
          const isLast = index === cycle.phases.length - 1;
          const colorTheme = ['Cotton','Garlic'].includes(activeCrop) ? '#cbd5e1' : cycle.theme;
          return (
            <View key={index} style={styles.phaseRow}>
              {/* Vertical Timeline Line */}
              <View style={styles.timelineGraphic}>
                <View style={[styles.iconCircle, { backgroundColor: `${colorTheme}20`, borderColor: colorTheme }]}>
                  <PhaseIcon size={20} color={colorTheme} />
                </View>
                {!isLast && <View style={[styles.verticalLine, { backgroundColor: `${colorTheme}40` }]} />}
              </View>

              {/* Phase Info */}
              <LinearGradient 
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} 
                style={styles.phaseInfoCard}
              >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                  <Text style={styles.phaseTitle}>{phase.title}</Text>
                  <Text style={styles.phaseDays}>{phase.days}</Text>
                </View>
                <Text style={styles.phaseDesc}>{phase.desc}</Text>
              </LinearGradient>
            </View>
          )
        })}

        {/* Basic Care Guide */}
        <Text style={styles.sectionHeader}>4. Basic Care Guide</Text>
        <LinearGradient colors={['rgba(16, 185, 129, 0.05)', 'rgba(16, 185, 129, 0.02)']} style={styles.careCard}>
           
           <View style={styles.careRow}>
             <View style={styles.careIconBox}><Droplets size={20} color="#3b82f6" /></View>
             <View style={{flex: 1}}>
               <Text style={styles.careTitle}>Watering</Text>
               <Text style={styles.careDesc}>{cycle.care.water}</Text>
             </View>
           </View>

           <View style={styles.careRow}>
             <View style={[styles.careIconBox, {backgroundColor: 'rgba(245, 158, 11, 0.1)'}]}><Sun size={20} color="#f59e0b" /></View>
             <View style={{flex: 1}}>
               <Text style={styles.careTitle}>Sunlight</Text>
               <Text style={styles.careDesc}>{cycle.care.sunlight}</Text>
             </View>
           </View>

           <View style={styles.careRow}>
             <View style={[styles.careIconBox, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}><Leaf size={20} color="#10b981" /></View>
             <View style={{flex: 1}}>
               <Text style={styles.careTitle}>Soil Prep</Text>
               <Text style={styles.careDesc}>{cycle.care.soil}</Text>
             </View>
           </View>

           <View style={[styles.careRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
             <View style={[styles.careIconBox, {backgroundColor: 'rgba(244, 63, 94, 0.1)'}]}><ShieldAlert size={20} color="#f43f5e" /></View>
             <View style={{flex: 1}}>
               <Text style={styles.careTitle}>Pests & Disease</Text>
               <Text style={styles.careDesc}>{cycle.care.pest}</Text>
             </View>
           </View>

        </LinearGradient>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  
  sectionHeader: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 16 },
  
  cropSelector: { flexDirection: 'row', marginBottom: 24, marginHorizontal: -20, paddingHorizontal: 20 },
  cropPill: { 
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 12, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
  },
  cropText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },

  timelineCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, paddingVertical: 20, paddingLeft: 20, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32
  },
  monthBox: { width: 60, alignItems: 'center', marginRight: 8 },
  monthLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  monthBar: { width: '100%', height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  legendRow: { flexDirection: 'row', marginTop: 24, paddingRight: 20, justifyContent: 'space-around', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },

  phaseRow: { flexDirection: 'row', marginBottom: 0 },
  timelineGraphic: { width: 50, alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  verticalLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -4, zIndex: 1 },
  
  phaseInfoCard: { 
    flex: 1, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  phaseTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  phaseDays: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  phaseDesc: { color: '#94a3b8', fontSize: 14, lineHeight: 22 },

  careCard: { 
    backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)', marginBottom: 24 
  },
  careRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 20 },
  careIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  careTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  careDesc: { color: '#94a3b8', fontSize: 14, lineHeight: 22 }
});
