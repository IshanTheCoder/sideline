import React from 'react';
import Svg, { Rect, G, Circle, Path, Ellipse } from 'react-native-svg';

export function SidelineIcon({ width = 200, height = 200, style }) {
  return (
    <Svg viewBox="0 0 200 200" width={width} height={height} style={style}>
      {/* App Icon - Square with teal background */}
      <Rect x="0" y="0" width="200" height="200" rx="44" fill="#5A8A6D"/>
      
      {/* Whistle icon centered */}
      <G transform="translate(100, 100)">
        {/* Main whistle body */}
        <Rect x="-35" y="-40" width="70" height="53" rx="10" fill="#9DC4A8" stroke="#FFFFFF" strokeWidth="3"/>
        
        {/* Whistle mouthpiece */}
        <Ellipse cx="-35" cy="-13" rx="10" ry="15" fill="#B5D9C3" stroke="#FFFFFF" strokeWidth="3"/>
        
        {/* Whistle sound hole */}
        <Rect x="12" y="-23" width="12" height="12" rx="2" fill="#2D4A3E"/>
        
        {/* Ring attachment */}
        <Circle cx="30" cy="-13" r="10" fill="none" stroke="#FFFFFF" strokeWidth="4"/>
        
        {/* Whistle cord */}
        <Path
          d="M 30 -3 Q 35 12, 25 32 Q 15 50, 0 55"
          fill="none"
          stroke="#2D4A3E"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Path
          d="M 30 -3 Q 18 15, 8 35 Q -2 50, -15 53"
          fill="none"
          stroke="#2D4A3E"
          strokeWidth="5"
          strokeLinecap="round"
        />
        
        {/* Sound lines */}
        <Path d="M 42 -35 L 53 -42" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
        <Path d="M 47 -23 L 60 -23" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
        <Path d="M 42 -11 L 53 -4" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
      </G>
    </Svg>
  );
}
