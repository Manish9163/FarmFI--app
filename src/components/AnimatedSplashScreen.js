import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { Sun, Sprout, Leaf, Tractor, Bug, CloudRain } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// The 6 sequence icons simulating the farming life cycle
const SEQUENCE_ICONS = [Sun, Sprout, Leaf, Tractor, Bug, CloudRain];

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const masterOpacity = useSharedValue(1);
  const currentIconAnim = useSharedValue(-0.5);
  const frameScale = useSharedValue(0.9);

  const logoTranslateX = useSharedValue(0); // Drives the logo moving left

  const fOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateX = useSharedValue(0); // Drives the typography moving right
  const titleTranslateY = useSharedValue(10);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => { });

    // EASE IN/OUT RAPID FIRE SEQUENCE
    currentIconAnim.value = withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.ease) }, (finished) => {
      if (finished) {
        fOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        frameScale.value = withTiming(1.1, { duration: 800, easing: Easing.elastic(1.5) });

        // Split the logo out horizontally to the left to make room for words
        logoTranslateX.value = withDelay(
          300,
          withTiming(-120, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
        );

        titleOpacity.value = withDelay(
          300,
          withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
        );
        titleTranslateY.value = withDelay(
          300,
          withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
        );
        titleTranslateX.value = withDelay(
          300,
          withTiming(60, { duration: 800, easing: Easing.out(Easing.back(1.5)) }, (f2) => {
            if (f2) {
              setTimeout(() => runOnJS(startFadeOut)(), 1400);
            }
          })
        );
      }
    });
  }, []);

  const startFadeOut = () => {
    masterOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }, (finished) => {
      if (finished) {
        runOnJS(onAnimationComplete)();
      }
    });
  };

  const rMasterStyle = useAnimatedStyle(() => ({
    opacity: masterOpacity.value,
  }));

  const rFrameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: logoTranslateX.value },
      { scale: frameScale.value }
    ],
  }));

  const rFStyle = useAnimatedStyle(() => ({
    opacity: fOpacity.value,
    position: 'absolute',
  }));

  const rTextStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { translateX: titleTranslateX.value },
      { translateY: titleTranslateY.value }
    ],
  }));

  return (
    <Animated.View style={[styles.container, rMasterStyle]}>
      {/* 1. Ultra-clean, premium gradient background */}
      <LinearGradient
        colors={['#064e3b', '#022c22']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Soft glowing backdrop */}
      <View style={styles.glow} />

      <View style={styles.content}>

        {/* Unified Framed Container (Scales elastically at the end) */}
        <Animated.View style={[styles.iconFrame, rFrameStyle]}>

          {/* 3. The Rapid Fire Engine INSIDE the Border */}
          {SEQUENCE_ICONS.map((Icon, index) => {
            const rIconStyle = useAnimatedStyle(() => {
              const isActive = currentIconAnim.value >= index - 0.5 && currentIconAnim.value < index + 1;
              const progress = currentIconAnim.value - index;

              let opacity = 0;
              let scale = 0.5;

              if (isActive) {
                opacity = Math.max(0, 1 - Math.pow((progress * 2) - 1, 2));
                scale = 0.7 + (progress * 0.4);
              }

              return {
                opacity,
                transform: [{ scale }],
                position: 'absolute',
              };
            });

            return (
              <Animated.View key={index} style={rIconStyle}>
                <Icon size={70} color="#10b981" strokeWidth={1.5} />
              </Animated.View>
            );
          })}

          {/* 4. The Giant "F" Crossfades perfectly over the sequence inside the frame */}
          <Animated.View style={rFStyle}>
            <Animated.Image
              source={require('../../assets/logo_f_clear.png')}
              style={styles.fImage}
              resizeMode="contain"
            />
          </Animated.View>

        </Animated.View>

        {/* 5. The Name Slider (Slides out to the RIGHT like an opening drawer!) */}
        <Animated.View style={[styles.textWrapper, rTextStyle]}>
          <Animated.Text style={styles.title}>FarmFi</Animated.Text>
          <Animated.Text style={styles.tagline}>INTELLIGENT AGRICULTURE</Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    transform: [{ translateY: -40 }],
  },
  glow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: '#10b981',
    opacity: 0.12,
    top: '15%',
    filter: 'blur(90px)',
  },
  fContainer: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 10px 20px rgba(16, 185, 129, 0.4)',
  },
  iconFrame: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 10px 20px rgba(16, 185, 129, 0.3)',
    overflow: 'hidden',
    position: 'absolute', // Starts perfectly center screen!
  },
  fImage: {
    width: 140,
    height: 140,
    borderRadius: 36, // Exact identical arc curve as the iconFrame!
  },
  textWrapper: {
    justifyContent: 'center',
    position: 'absolute', // Hidden directly behind the logo initially!
  },
  title: {
    fontSize: 54,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 10,
    color: '#34d399',
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: -2,
  },
});
