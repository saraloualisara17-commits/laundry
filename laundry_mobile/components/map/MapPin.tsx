import React from 'react';
import { View } from 'react-native';
import { STATUS_COLORS } from '../../constants/StatusColors';

interface MapPinProps {
  status?: string;
  color?: string;
  selected?: boolean;
}

const MapPin = ({ status, color, selected = false }: MapPinProps) => {
  const pinColor = color || (status ? STATUS_COLORS[status] : '#94A3B8') || '#94A3B8';

  const bodyW = selected ? 32 : 26;
  const bodyH = selected ? 40 : 32;
  const borderR = bodyW / 2;
  const tailW = selected ? 14 : 11;
  const tailH = selected ? 10 : 8;

  return (
    <View style={{ alignItems: 'center', width: bodyW + 4, paddingBottom: 2 }}>
      {/* Pin body — rounded top, pointed bottom via border-radius trick */}
      <View
        style={{
          width: bodyW,
          height: bodyH,
          backgroundColor: pinColor,
          borderRadius: borderR,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          borderWidth: selected ? 2.5 : 2,
          borderColor: 'white',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: selected ? 4 : 2 },
          shadowOpacity: selected ? 0.45 : 0.3,
          shadowRadius: selected ? 6 : 3,
          elevation: selected ? 10 : 5,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* White dot in the center — matches Google Maps style */}
        <View
          style={{
            width: selected ? 10 : 8,
            height: selected ? 10 : 8,
            borderRadius: selected ? 5 : 4,
            backgroundColor: 'white',
            opacity: 0.9,
          }}
        />
      </View>

      {/* Triangle tail pointing down */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: tailW / 2,
          borderRightWidth: tailW / 2,
          borderTopWidth: tailH,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: pinColor,
          marginTop: -1,
        }}
      />
    </View>
  );
};

export default React.memo(MapPin);
