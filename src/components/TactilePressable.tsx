import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle, StyleSheet } from 'react-native';

interface TactilePressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: string;
}

export const TactilePressable: React.FC<TactilePressableProps> = ({
  children,
  style,
  containerStyle,
  onPress,
  scaleTo = 0.96,
  disabled = false,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (disabled) {
      return;
    }
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();

    if (rest.onPressIn) {
      rest.onPressIn(e);
    }
  };

  const handlePressOut = (e: any) => {
    if (disabled) {
      return;
    }
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();

    if (rest.onPressOut) {
      rest.onPressOut(e);
    }
  };

  const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const flatContainer = (StyleSheet.flatten(containerStyle) || {}) as ViewStyle;

  const pressableStyle: ViewStyle = {
    ...flatContainer,
  };

  if (flatStyle.position === 'absolute') {
    pressableStyle.position = 'absolute';
    if (flatStyle.left !== undefined) pressableStyle.left = flatStyle.left;
    if (flatStyle.top !== undefined) pressableStyle.top = flatStyle.top;
    if (flatStyle.right !== undefined) pressableStyle.right = flatStyle.right;
    if (flatStyle.bottom !== undefined) pressableStyle.bottom = flatStyle.bottom;
    if (flatStyle.zIndex !== undefined) pressableStyle.zIndex = flatStyle.zIndex;
  }
  if (flatStyle.width !== undefined) pressableStyle.width = flatStyle.width;
  if (flatStyle.height !== undefined) pressableStyle.height = flatStyle.height;
  if (flatStyle.flex !== undefined) pressableStyle.flex = flatStyle.flex;
  if (flatStyle.alignSelf !== undefined) pressableStyle.alignSelf = flatStyle.alignSelf;
  if (flatStyle.margin !== undefined) pressableStyle.margin = flatStyle.margin;
  if (flatStyle.marginTop !== undefined) pressableStyle.marginTop = flatStyle.marginTop;
  if (flatStyle.marginBottom !== undefined) pressableStyle.marginBottom = flatStyle.marginBottom;
  if (flatStyle.marginLeft !== undefined) pressableStyle.marginLeft = flatStyle.marginLeft;
  if (flatStyle.marginRight !== undefined) pressableStyle.marginRight = flatStyle.marginRight;
  if (flatStyle.marginHorizontal !== undefined) pressableStyle.marginHorizontal = flatStyle.marginHorizontal;
  if (flatStyle.marginVertical !== undefined) pressableStyle.marginVertical = flatStyle.marginVertical;

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={pressableStyle}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
