import React from 'react';
import Svg, { Rect, G, Circle, Path, Ellipse } from 'react-native-svg';
import { StyleSheet, ViewStyle } from 'react-native';

interface AnchorIconProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function AnchorIcon({ width = 200, height = 200, style }: AnchorIconProps) {
  return (
    <Svg viewBox="0 0 200 200" width={width} height={height} style={style}>
      {/* App Icon - Square with background */}
      <Rect x="0" y="0" width="200" height="200" rx="44" fill="#1B3B5F"/>
      
      {/* Anchor icon centered */}
      <G transform="translate(100, 110)">
        {/* Ring */}
        <Circle cx="0" cy="-42" r="8" fill="none" stroke="white" strokeWidth="4"/>
        <Circle cx="0" cy="-42" r="5" fill="none" stroke="white" strokeWidth="1.5"/>
        
        {/* Shackle */}
        <Path
          d="M -5 -35 L -5 -30 Q -5 -28, -2.5 -28 L 2.5 -28 Q 5 -28, 5 -30 L 5 -35"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Shaft */}
        <Rect x="-3.5" y="-28" width="7" height="68" fill="white" rx="1"/>
        
        {/* Crown */}
        <Ellipse cx="0" cy="-28" rx="10" ry="5" fill="white"/>
        
        {/* Crossbar */}
        <Rect x="-34" y="8" width="68" height="6" fill="white" rx="3"/>
        <Circle cx="-34" cy="11" r="4" fill="white"/>
        <Circle cx="34" cy="11" r="4" fill="white"/>
        
        {/* Left fluke */}
        <Path
          d="M -34 11 Q -36 16, -36 24 Q -36 36, -27 42 Q -24 44, -19 44 L -3.5 38 Q -3.5 36.5, -5 36 L -17 40 Q -20 39.5, -23 37 Q -30 31, -30 24 Q -30 17, -28 13 Z"
          fill="#FF6B4A"
        />
        <Path
          d="M -19 44 Q -16 45, -11 43 L -3.5 40 L -5 38 L -11 41 Q -14 42, -17 40 Z"
          fill="#E85A3A"
        />
        
        {/* Right fluke */}
        <Path
          d="M 34 11 Q 36 16, 36 24 Q 36 36, 27 42 Q 24 44, 19 44 L 3.5 38 Q 3.5 36.5, 5 36 L 17 40 Q 20 39.5, 23 37 Q 30 31, 30 24 Q 30 17, 28 13 Z"
          fill="#FF6B4A"
        />
        <Path
          d="M 19 44 Q 16 45, 11 43 L 3.5 40 L 5 38 L 11 41 Q 14 42, 17 40 Z"
          fill="#E85A3A"
        />
      </G>
    </Svg>
  );
}
