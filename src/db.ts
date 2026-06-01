import { requireFromUrl } from 'require-from-remote';
import Strapi from 'strapi-sdk-js';

// 安全说明：此方式从外部 CDN 加载可执行代码，存在供应链风险。
// 若 static.mrabit.com 被入侵，所有部署将执行恶意代码。
// 适用于受控的个人/内部项目；如需更高安全性，建议改用 npm 包管理。
const strapi = requireFromUrl('https://static.mrabit.com/remote-pack/strapi.js') as Strapi;

// Strapi collection: seriesupdates (字段: name, SERIES_ID, SEASON_ID, URL)
// helpers 内部处理 Strapi 响应格式，对调用方返回平层数据
// Strapi v5 使用 documentId 作为操作主键，这里统一映射为 id

export interface SeriesUpdate {
  id: string;
  name: string;
  SERIES_ID: string;
  SEASON_ID: string;
  URL: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'seriesupdates';

interface StrapiEntity {
  id: number;
  documentId: string;
  name?: string;
  SERIES_ID?: string;
  SEASON_ID?: string;
  URL?: string;
  createdAt?: string;
  updatedAt?: string;
}

function toSeriesUpdate(entity: StrapiEntity): SeriesUpdate {
  return {
    id: entity.documentId,
    name: entity.name ?? '',
    SERIES_ID: entity.SERIES_ID ?? '',
    SEASON_ID: entity.SEASON_ID ?? '',
    URL: entity.URL ?? '',
    createdAt: entity.createdAt ?? new Date().toISOString(),
    updatedAt: entity.updatedAt ?? new Date().toISOString(),
  };
}

const getSeriesUpdates = async (search?: string): Promise<SeriesUpdate[]> => {
  const params: Record<string, unknown> = { sort: 'createdAt:desc' };
  if (search) {
    params.filters = {
      $or: [
        { name: { $containsi: search } },
        { SERIES_ID: { $containsi: search } },
        { SEASON_ID: { $containsi: search } },
      ],
    };
  }
  const result = await strapi.find(COLLECTION, params);
  return ((result.data ?? []) as StrapiEntity[]).map(toSeriesUpdate);
};

const createSeriesUpdate = async (
  data: Omit<SeriesUpdate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SeriesUpdate> => {
  const result = await strapi.create(COLLECTION, data);
  return toSeriesUpdate(result.data as StrapiEntity);
};

const updateSeriesUpdate = async (
  id: string,
  data: Partial<Omit<SeriesUpdate, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<SeriesUpdate> => {
  const result = await strapi.update(COLLECTION, id, data);
  return toSeriesUpdate(result.data as StrapiEntity);
};

const deleteSeriesUpdate = async (id: string): Promise<void> => {
  await strapi.delete(COLLECTION, id);
};

export default {
  strapi,
  getSeriesUpdates,
  createSeriesUpdate,
  updateSeriesUpdate,
  deleteSeriesUpdate,
};
