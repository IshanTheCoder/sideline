import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export function GoogleLogoIcon({ size = 18, color = '#E6EAF2' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M17.64 9.2045C17.64 8.5663 17.5827 7.95266 17.4764 7.36353H9V10.8453H13.8436C13.635 11.9703 12.9995 12.9245 12.0455 13.5627V15.8218H14.9564C16.6595 14.2536 17.64 11.9458 17.64 9.2045Z"
        fill={color}
      />
      <Path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8218L12.0455 13.5627C11.2391 14.1036 10.2082 14.4227 9 14.4227C6.65682 14.4227 4.67318 12.8391 3.96545 10.71H0.95636V13.0427C2.43727 15.9832 5.47909 18 9 18Z"
        fill={color}
      />
      <Path
        d="M3.96545 10.71C3.78545 10.1691 3.68318 9.59182 3.68318 9C3.68318 8.40818 3.78545 7.83091 3.96545 7.29V4.95727H0.956364C0.347727 6.17 0 7.54182 0 9C0 10.4582 0.347727 11.83 0.956364 13.0427L3.96545 10.71Z"
        fill={color}
      />
      <Path
        d="M9 3.57727C10.3186 3.57727 11.5023 4.03091 12.4336 4.92136L15.0218 2.33318C13.4632 0.874091 11.4259 0 9 0C5.47909 0 2.43727 2.01682 0.95636 4.95727L3.96545 7.29C4.67318 5.16091 6.65682 3.57727 9 3.57727Z"
        fill={color}
      />
    </Svg>
  );
}

export function EyeIcon({ size = 22, color = '#9AA0A6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 22, color = '#9AA0A6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.88 5.08A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-4.09 5.18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.61 6.61A17.34 17.34 0 0 0 2 12s3.5 7 10 7a10.93 10.93 0 0 0 5.39-1.39"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
