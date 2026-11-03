/**
 * 站点基址。Vite 的 base 与 React Router 的 basename 必须一致，
 * 否则部署到子路径（如 /embodied-ai/）时路由会错位。
 */
export const BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined;
