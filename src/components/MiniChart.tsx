import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface Point { timestamp: string; value: number; }
interface Props { data: readonly Point[]; color?: string; height?: number; width?: number; }

// Cap rendered points to keep large history ranges responsive.
const MAX_CHART_POINTS = 60;

function downsampleData(data: readonly Point[], maxPoints: number): readonly Point[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: Point[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  return result;
}

export default function MiniChart({ data: rawData, color = '#00d4ff', height = 56, width: initialWidth = 0 }: Props) {
  const [width, setWidth] = useState(initialWidth);

  const onLayout = (e: LayoutChangeEvent) => {
    const measuredWidth = e.nativeEvent.layout.width;
    if (measuredWidth > 0 && initialWidth === 0) setWidth(measuredWidth);
  };

  const containerStyle = [styles.container, { height }];
  const data = downsampleData(rawData, MAX_CHART_POINTS);

  if (!data || data.length < 2 || width === 0) {
    return <View style={containerStyle} onLayout={onLayout} />;
  }

  const values = data.map(d => d.value);

  // Avoid spreading large arrays in the JS engine.
  const min = values.reduce((a, b) => (b < a ? b : a), Infinity);
  const max = values.reduce((a, b) => (b > a ? b : a), -Infinity);
  const range = max - min || 1;
  const pad = 4;
  const h = height;

  const points = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (width - pad * 2),
    y: pad + ((max - v) / range) * (h - pad * 2),
  }));

  // Each segment is a rotated View between adjacent points.
  const segments: Array<{ cx: number; cy: number; length: number; angle: number }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    segments.push({ cx, cy, length, angle });
  }

  return (
    <View style={containerStyle} onLayout={onLayout}>
      {points.map((p, i) => {
        const barW = width / points.length;
        return (
          <View
            key={`a${i}`}
            style={[
              styles.areaBar,
              {
                left: p.x - barW / 2,
                top: p.y,
                width: barW,
                height: h - p.y,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
      {segments.map((s, i) => (
        <View
          key={`s${i}`}
          style={[
            styles.segment,
            {
              left: s.cx - s.length / 2,
              top: s.cy - 1.5,
              width: s.length,
              backgroundColor: color,
              transform: [{ rotate: `${s.angle}deg` }],
            },
          ]}
        />
      ))}
      {points.map((p, i) => (
        <View
          key={`d${i}`}
          style={[
            styles.dot,
            {
              left: p.x - 2.5,
              top: p.y - 2.5,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  areaBar: { position: 'absolute', opacity: 0.12 },
  segment: { position: 'absolute', height: 3, borderRadius: 2 },
  dot: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
});
