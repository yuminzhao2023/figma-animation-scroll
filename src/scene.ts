export type Rect = [x: number, y: number, width: number, height: number];
export type SceneState = { rect: Rect; opacity?: number };
export type Layer = {
  id: string;
  src: string;
  states: [SceneState, SceneState, SceneState, SceneState];
  crop?: boolean;
  svg?: boolean;
};

const state = (rect: Rect, opacity = 1): SceneState => ({ rect, opacity });
const invisible = (rect: Rect): SceneState => state(rect, 0);

export const layers: Layer[] = [
  {
    id: 'sky', src: '/assets/imgBgSky.webp',
    states: [state([-96,-860,1500,2250]),state([-96,-860,1472,2208]),state([-54,-900,1654,2481]),invisible([-54,-900,1654,2481])],
  },
  {
    id: 'mountains', src: '/assets/imgMountains.webp',
    states: [state([-592,152,1997,2133]),state([-592,152,1997,2133]),state([-67,244,1372,1466]),invisible([-67,244,1372,1466])],
  },
  {
    id: 'explore', src: '/assets/imgExplore.svg', svg: true,
    states: [state([342,320,701.344,223.787]),state([266.112,320,777.232,248.002]),invisible([266.112,320,777.232,248.002]),invisible([266.112,320,777.232,248.002])],
  },
  {
    id: 'clouds01', src: '/assets/imgClouds01.webp',
    states: [state([-128,-285,2013.021,1057.532]),state([-88,-642,2013.021,1057.532]),state([-388,-406,2013.021,1057.532]),invisible([-388,-406,2013.021,1057.532])],
  },
  {
    id: 'clouds05', src: '/assets/imgClouds05.webp',
    states: [state([-673,-237,1628,1056]),state([-834,-591,1628,1056]),state([-834,-591,1628,1056]),invisible([-834,-591,1628,1056])],
  },
  {
    id: 'clouds03', src: '/assets/imgClouds03.webp', crop: true,
    states: [state([-1208,-101,3411.469,1523.681]),state([714,577,1582,707]),state([714,577,1582,707]),invisible([714,577,1582,707])],
  },
  {
    id: 'clouds02', src: '/assets/imgClouds01.webp',
    states: [state([-319,401,895,470]),state([-319,401,393,206]),state([-319,401,393,206]),invisible([-319,401,393,206])],
  },
  {
    id: 'clouds11', src: '/assets/imgClouds11.webp',
    states: [state([-176.55,-474,2379.447,1298.724]),state([1023,-474,1180,644]),state([1023,-474,1180,644]),invisible([1023,-474,1180,644])],
  },
  {
    id: 'clouds09', src: '/assets/imgClouds11.webp',
    states: [state([-1684,-21.77,2379.447,1298.724]),state([-1684,369,1664,908]),state([-1400,0,1664,908]),invisible([-1400,0,1664,908])],
  },
  {
    id: 'clouds07', src: '/assets/imgClouds11.webp',
    states: [state([-675.17,-425.3,2379.447,1298.724]),state([-675,-445,749,409]),state([-675,-445,749,409]),invisible([-675,-445,749,409])],
  },
  {
    id: 'cave', src: '/assets/imgCave.webp',
    states: [invisible([-751,-896,2783,2945]),state([-751,-896,2783,2945]),state([-256,-66,1856,1965]),state([-388,-758,2521,2669])],
  },
  {
    id: 'explorer', src: '/assets/imgExplorer.webp',
    states: [invisible([-592,-495,2492,1772]),state([-592,-495,2492,1772]),state([-606,-855,2492,1772]),state([-606,-1680,2492,1772])],
  },
];

export const endpoints = [0, 3.5, 6, 9.5] as const;

export function sceneSegment(time: number) {
  const segment = time < endpoints[1] ? 0 : time < endpoints[2] ? 1 : 2;
  const fraction = Math.max(0, Math.min(1, (time - endpoints[segment]) / (endpoints[segment + 1] - endpoints[segment])));
  return { segment, fraction };
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function interpolate(layer: Layer, time: number) {
  const { segment, fraction } = sceneSegment(time);
  const a = layer.states[segment];
  const b = layer.states[segment + 1];
  return {
    rect: a.rect.map((value, index) => mix(value, b.rect[index], fraction)) as Rect,
    opacity: mix(a.opacity ?? 1, b.opacity ?? 1, fraction),
  };
}
