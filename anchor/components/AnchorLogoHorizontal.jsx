import React from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Text } from 'react-native-svg';
import { StyleSheet, ViewStyle } from 'react-native';

export function AnchorLogoHorizontal({ width = 500, height = 150, style }: AnchorLogoHorizontalProps) {
  const viewBoxWidth = 600;
  const viewBoxHeight = 250;
  // Center the logo so the anchor's vertical shaft is at the exact middle
  const ancWidth = 132; // "ANC" text width
  const horWidth = 142; // "HOR" text width
  const spacingLeft = 12; // Space between left text and anchor
  const spacingRight = -8; // Pull HOR closer to the circle
  const anchorScale = 1.6; // Make anchor icon bigger to match mock
  const anchorHalfWidth = 55 * anchorScale;
  const textBlockWidth = Math.max(ancWidth, horWidth);
  
  // The viewBox is 600px wide, so center is at x=300
  const anchorCenterX = viewBoxWidth / 2;
  
  // Position "ANC" to the left of the anchor with equal block width
  const ancXPosition = anchorCenterX - anchorHalfWidth - spacingLeft - textBlockWidth;
  
  // Position "HOR" to the right of the anchor with equal block width
  const horXPosition = anchorCenterX + anchorHalfWidth + spacingRight;
  
  // Position text at baseline
  const textY = 5;
  
  return (
    <Svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} width={width} height={height} style={style}>
      {/* Logo: "ANC" - ICON - "HOR" with anchor centered at x=250 */}
      <G transform="translate(0, 135)">
        {/* "ANC" Text - C aligns with left crossbar circle */}
        <Text
          x={ancXPosition}
          y={textY}
          fontFamily="Arial, sans-serif"
          fontSize="76"
          fontWeight="700"
          fill="#3B6FA8"
          letterSpacing="3"
        >
          ANC
        </Text>
        
        {/* Anchor Icon - centered */}
        <G id="anchor-icon" transform={`translate(${anchorCenterX}, 0)`}>
          <G transform={`scale(${anchorScale})`}>
            {/* Ring at top with thickness - scaled up more */}
            <Circle cx="0" cy="-65" r="14" fill="none" stroke="#1B3B5F" strokeWidth="7"/>
            <Circle cx="0" cy="-65" r="8" fill="none" stroke="#1B3B5F" strokeWidth="3"/>
            
            {/* Shackle connecting ring to shaft */}
            <Path
              d="M -8 -54 L -8 -47 Q -8 -44, -4 -44 L 4 -44 Q 8 -44, 8 -47 L 8 -54"
              fill="none"
              stroke="#1B3B5F"
              strokeWidth="6"
              strokeLinecap="round"
            />
            
            {/* Main vertical shaft (stock) - scaled up more */}
            <Rect x="-6" y="-44" width="12" height="100" fill="#1B3B5F" rx="2"/>
            
            {/* Crown (top of anchor) */}
            <Ellipse cx="0" cy="-44" rx="16" ry="8" fill="#1B3B5F"/>
            
            {/* Crossbar (arms/stock) with rounded ends - scaled up more */}
            <Rect x="-55" y="10" width="110" height="9" fill="#1B3B5F" rx="4.5"/>
            <Circle cx="-55" cy="14.5" r="7" fill="#1B3B5F"/>
            <Circle cx="55" cy="14.5" r="7" fill="#1B3B5F"/>
            
            {/* Left fluke - cleaner, solid design, scaled up */}
            <Path
              d="M -55 15 Q -57 20, -57 32 Q -57 48, -46 60 Q -42 64, -34 66 Q -28 67, -20 66 L -6 58 L -6 54 Q -15 59, -24 59 Q -34 57, -42 49 Q -50 41, -50 32 Q -50 23, -48 18 Z"
              fill="#FF6B4A"
            />
            
            {/* Right fluke - cleaner, solid design, scaled up */}
            <Path
              d="M 55 15 Q 57 20, 57 32 Q 57 48, 46 60 Q 42 64, 34 66 Q 28 67, 20 66 L 6 58 L 6 54 Q 15 59, 24 59 Q 34 57, 42 49 Q 50 41, 50 32 Q 50 23, 48 18 Z"
              fill="#FF6B4A"
            />
          </G>
        </G>
        
        {/* "HOR" Text - H aligns with right crossbar circle */}
        <Text
          x={horXPosition}
          y={textY}
          fontFamily="Arial, sans-serif"
          fontSize="76"
          fontWeight="700"
          fill="#3B6FA8"
          letterSpacing="3"
        >
          HOR
        </Text>
      </G>
    </Svg>
  );
}
