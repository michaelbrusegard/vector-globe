type Feature = {
  type: 'Feature';
  properties: {
    ID: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
};

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Feature[];
};

async function getGeojson(
  detailLevel: 'low' | 'medium' | 'high',
  countries: boolean,
): Promise<FeatureCollection> {
  let data;

  if (detailLevel === 'high') {
    data = countries
      ? await import('./geodata/ne_10m_countries.json')
      : await import('./geodata/ne_10m_land.json');
  } else if (detailLevel === 'medium') {
    data = countries
      ? await import('./geodata/ne_50m_countries.json')
      : await import('./geodata/ne_50m_land.json');
  } else {
    data = countries
      ? await import('./geodata/ne_110m_countries.json')
      : await import('./geodata/ne_110m_land.json');
  }

  return data.default as FeatureCollection;
}

export { getGeojson, type Feature, type FeatureCollection };
