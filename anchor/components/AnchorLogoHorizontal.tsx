import React from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Text } from 'react-native-svg';
import { StyleSheet, ViewStyle } from 'react-native';

interface AnchorLogoHorizontalProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function AnchorLogoHorizontal({ width = 500, height = 150, style }: AnchorLogoHorizontalProps) {
  // Calculate positions for centering
  // "ANCHOR" text is approximately 300px wide (72px font + letter spacing)
  const textWidth = 300;
  const spacing = 50; // Gap between text and icon (ensures no overlap)
  const iconWidth = 90; // Anchor icon width (from -45 to +45)
  const totalWidth = textWidth + spacing + iconWidth;
  const startX = (500 - totalWidth) / 2; // Center the entire logo
  
  // Position anchor icon to the right of text with proper spacing
  // Icon is centered at its transform point, so we position it at text end + spacing + icon center offset
  const iconX = startX + textWidth + spacing + 45; // +45 to account for icon extending left from center
  
  return (
    <Svg viewBox="0 0 500 150" width={width} height={height} style={style}>
      {/* Full Logo with Text on Left and Icon on Right - Centered */}
      <G transform={`translate(${startX}, 70)`}>
        {/* "ANCHOR" Text - positioned on the left */}
        <Text
          x="0"
          y="20"
          fontFamily="Arial, sans-serif"
          fontSize="72"
          fontWeight="700"
          fill="#3B6FA8"
          letterSpacing="4"
        >
          ANCHOR
        </Text>
        
        {/* Realistic but clean Anchor Icon - positioned to the right of text with spacing, moved up */}
        <G id="anchor-icon" transform={`translate(${textWidth + spacing + 45}, 10)`}>
          {/* Ring at top with thickness - scaled up */}
          <Circle cx="0" cy="-60" r="12" fill="none" stroke="#1B3B5F" strokeWidth="6"/>
          <Circle cx="0" cy="-60" r="7" fill="none" stroke="#1B3B5F" strokeWidth="2.5"/>
          
          {/* Shackle connecting ring to shaft */}
          <Path
            d="M -7 -50 L -7 -43 Q -7 -40, -3.5 -40 L 3.5 -40 Q 7 -40, 7 -43 L 7 -50"
            fill="none"
            stroke="#1B3B5F"
            strokeWidth="5"
            strokeLinecap="round"
          />
          
          {/* Main vertical shaft (stock) - scaled up */}
          <Rect x="-5" y="-40" width="10" height="90" fill="#1B3B5F" rx="1.5"/>
          
          {/* Crown (top of anchor) */}
          <Ellipse cx="0" cy="-40" rx="14" ry="7" fill="#1B3B5F"/>
          
          {/* Crossbar (arms/stock) with rounded ends - scaled up */}
          <Rect x="-45" y="10" width="90" height="8" fill="#1B3B5F" rx="4"/>
          <Circle cx="-45" cy="14" r="6" fill="#1B3B5F"/>
          <Circle cx="45" cy="14" r="6" fill="#1B3B5F"/>
          
          {/* Left fluke (curved, realistic shape) - scaled up */}
          <G>
            <Path
              d="M -45 14 Q -47 20, -47 32 Q -47 48, -36 58 Q -32 61, -25 61 L -5 52 Q -5 50, -7 49 L -22 55 Q -27 54, -30 51 Q -39 43, -39 32 Q -39 23, -37 17 Z"
              fill="#FF6B4A"
            />
            <Path
              d="M -25 61 Q -21 62, -14 60 L -5 56 L -7 54 L -15 57 Q -19 58, -22 55 Z"
              fill="#E85A3A"
            />
          </G>
          
          {/* Right fluke (mirrored) - scaled up */}
          <G>
            <Path
              d="M 45 14 Q 47 20, 47 32 Q 47 48, 36 58 Q 32 61, 25 61 L 5 52 Q 5 50, 7 49 L 22 55 Q 27 54, 30 51 Q 39 43, 39 32 Q 39 23, 37 17 Z"
              fill="#FF6B4A"
            />
            <Path
              d="M 25 61 Q 21 62, 14 60 L 5 56 L 7 54 L 15 57 Q 19 58, 22 55 Z"
              fill="#E85A3A"
            />
          </G>
        </G>
      </G>
    </Svg>
  );
}
