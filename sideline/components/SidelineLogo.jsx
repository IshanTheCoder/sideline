import React from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Text } from 'react-native-svg';

export function SidelineLogo({ width = 400, height = 200, style }) {
  return (
    <Svg viewBox="0 0 400 200" width={width} height={height} style={style}>
      {/* Full Logo with Whistle Icon and Text */}
      <G transform="translate(70, 100)">
        {/* Whistle Icon */}
        <G id="whistle-icon" transform="translate(0, -5)">
          {/* Main whistle body */}
          <Rect x="-25" y="-30" width="50" height="38" rx="7" fill="#9DC4A8" stroke="#5A8A6D" strokeWidth="2"/>
          
          {/* Whistle mouthpiece */}
          <Ellipse cx="-25" cy="-10" rx="7" ry="10" fill="#B5D9C3" stroke="#5A8A6D" strokeWidth="2"/>
          
          {/* Whistle sound hole */}
          <Rect x="8" y="-17" width="8" height="8" rx="2" fill="#5A8A6D"/>
          
          {/* Ring attachment */}
          <Circle cx="20" cy="-10" r="7" fill="none" stroke="#5A8A6D" strokeWidth="2.5"/>
          
          {/* Whistle cord */}
          <Path
            d="M 20 -3 Q 25 8, 18 22 Q 12 35, 0 38"
            fill="none"
            stroke="#2D4A3E"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Path
            d="M 20 -3 Q 13 10, 5 24 Q -2 35, -10 37"
            fill="none"
            stroke="#2D4A3E"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          
          {/* Sound lines */}
          <Path d="M 30 -25 L 38 -29" stroke="#5A8A6D" strokeWidth="2.5" strokeLinecap="round"/>
          <Path d="M 33 -17 L 43 -17" stroke="#5A8A6D" strokeWidth="2.5" strokeLinecap="round"/>
          <Path d="M 30 -9 L 38 -5" stroke="#5A8A6D" strokeWidth="2.5" strokeLinecap="round"/>
        </G>
        
        {/* "SIDELINE" Text */}
        <Text
          x="60"
          y="10"
          fontFamily="Arial, sans-serif"
          fontSize="48"
          fontWeight="700"
          fill="#5A8A6D"
          letterSpacing="2"
        >
          SIDELINE
        </Text>
      </G>
    </Svg>
  );
}
