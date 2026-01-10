import React from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Text } from 'react-native-svg';
import { StyleSheet, ViewStyle } from 'react-native';

interface AnchorLogoProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function AnchorLogo({ width = 400, height = 200, style }: AnchorLogoProps) {
  return (
    <Svg viewBox="0 0 400 200" width={width} height={height} style={style}>
      {/* Full Logo with Icon and Text - Transparent Background */}
      <G transform="translate(70, 100)">
        {/* Realistic but clean Anchor Icon */}
        <G id="anchor-icon" transform="translate(0, -5)">
          {/* Ring at top with thickness */}
          <Circle cx="0" cy="-52" r="10" fill="none" stroke="#1B3B5F" strokeWidth="5"/>
          <Circle cx="0" cy="-52" r="6" fill="none" stroke="#1B3B5F" strokeWidth="2"/>
          
          {/* Shackle connecting ring to shaft */}
          <Path
            d="M -6 -44 L -6 -38 Q -6 -35, -3 -35 L 3 -35 Q 6 -35, 6 -38 L 6 -44"
            fill="none"
            stroke="#1B3B5F"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Main vertical shaft (stock) */}
          <Rect x="-4" y="-35" width="8" height="80" fill="#1B3B5F" rx="1"/>
          
          {/* Crown (top of anchor) */}
          <Ellipse cx="0" cy="-35" rx="12" ry="6" fill="#1B3B5F"/>
          
          {/* Crossbar (arms/stock) with rounded ends */}
          <Rect x="-40" y="8" width="80" height="7" fill="#1B3B5F" rx="3.5"/>
          <Circle cx="-40" cy="11.5" r="5" fill="#1B3B5F"/>
          <Circle cx="40" cy="11.5" r="5" fill="#1B3B5F"/>
          
          {/* Left fluke (curved, realistic shape) */}
          <G>
            <Path
              d="M -40 12 Q -42 18, -42 28 Q -42 42, -32 50 Q -28 53, -22 53 L -4 45 Q -4 43, -6 42 L -20 48 Q -24 47, -27 44 Q -35 37, -35 28 Q -35 20, -33 15 Z"
              fill="#FF6B4A"
            />
            <Path
              d="M -22 53 Q -18 54, -12 52 L -4 48 L -6 46 L -13 49 Q -17 50, -20 48 Z"
              fill="#E85A3A"
            />
          </G>
          
          {/* Right fluke (mirrored) */}
          <G>
            <Path
              d="M 40 12 Q 42 18, 42 28 Q 42 42, 32 50 Q 28 53, 22 53 L 4 45 Q 4 43, 6 42 L 20 48 Q 24 47, 27 44 Q 35 37, 35 28 Q 35 20, 33 15 Z"
              fill="#FF6B4A"
            />
            <Path
              d="M 22 53 Q 18 54, 12 52 L 4 48 L 6 46 L 13 49 Q 17 50, 20 48 Z"
              fill="#E85A3A"
            />
          </G>
        </G>
        
        {/* "ANCHOR" Text */}
        <Text
          x="75"
          y="10"
          fontFamily="Arial, sans-serif"
          fontSize="54"
          fontWeight="700"
          fill="#1B3B5F"
          letterSpacing="3"
        >
          ANCHOR
        </Text>
      </G>
    </Svg>
  );
}
