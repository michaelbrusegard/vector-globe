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
  let url;

  if (detailLevel === 'high') {
    url = countries ? '/ne_10m_countries.json' : '/ne_10m_land.json';
  } else if (detailLevel === 'medium') {
    url = countries ? '/ne_50m_countries.json' : '/ne_50m_land.json';
  } else {
    url = countries ? '/ne_110m_countries.json' : '/ne_110m_land.json';
  }

  const response = await fetch(url);
  const data = (await response.json()) as FeatureCollection;

  return data;
}

export { getGeojson, type Feature, type FeatureCollection };
