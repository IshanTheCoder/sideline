import React from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Text } from 'react-native-svg';

export function SidelineLogoHorizontal({ width = 500, height = 150, style }) {
  return (
    <Svg viewBox="0 0 600 200" width={width} height={height} style={style}>
      {/* Sideline Logo with Whistle Icon */}
      <G transform="translate(300, 100)">
        {/* Whistle Icon - centered */}
        <G id="whistle-icon" transform="translate(-200, 0)">
          {/* Main whistle body */}
          <Rect x="-30" y="-35" width="60" height="45" rx="8" fill="#9DC4A8" stroke="#5A8A6D" strokeWidth="2"/>
          
          {/* Whistle mouthpiece */}
          <Ellipse cx="-30" cy="-12" rx="8" ry="12" fill="#B5D9C3" stroke="#5A8A6D" strokeWidth="2"/>
          
          {/* Whistle sound hole */}
          <Rect x="10" y="-20" width="10" height="10" rx="2" fill="#5A8A6D"/>
          
          {/* Ring attachment */}
          <Circle cx="25" cy="-12" r="8" fill="none" stroke="#5A8A6D" strokeWidth="3"/>
          
          {/* Whistle cord - curved */}
          <Path
            d="M 25 -4 Q 30 10, 20 30 Q 10 50, -5 55"
            fill="none"
            stroke="#2D4A3E"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Path
            d="M 25 -4 Q 15 15, 5 35 Q -5 50, -15 53"
            fill="none"
            stroke="#2D4A3E"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Sound lines */}
          <Path d="M 35 -30 L 45 -35" stroke="#5A8A6D" strokeWidth="3" strokeLinecap="round"/>
          <Path d="M 40 -20 L 52 -20" stroke="#5A8A6D" strokeWidth="3" strokeLinecap="round"/>
          <Path d="M 35 -10 L 45 -5" stroke="#5A8A6D" strokeWidth="3" strokeLinecap="round"/>
        </G>
        
        {/* "SIDELINE" Text */}
        <Text
          x="-80"
          y="15"
          fontFamily="Arial, sans-serif"
          fontSize="64"
          fontWeight="700"
          fill="#5A8A6D"
          letterSpacing="3"
        >
          SIDELINE
        </Text>
      </G>
    </Svg>
  );
}
