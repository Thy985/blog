import { Outlet, Route, Routes, useParams } from 'react-router';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HomePage } from '@/components/HomePage';
import { ChapterPage } from '@/components/chapter/ChapterPage';
import { NotFound } from '@/components/NotFound';
import { useScrollManager } from '@/lib/scroll';
import { AnatomyScene } from '@/three/scenes/AnatomyScene';
import { TfScene } from '@/three/scenes/TfScene';
import { IkScene } from '@/three/scenes/IkScene';
import { PlanningScene } from '@/three/scenes/PlanningScene';
import { DualScene } from '@/three/scenes/DualScene';
import { SafetyScene } from '@/three/scenes/SafetyScene';

/** 文档式页面共用的外壳：页眉 + 正文 + 页脚 */
function SiteChrome() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到正文
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

/** 3D 场景路由：全屏沉浸，不带文档页眉 */
function SceneRouter() {
  const { key = '' } = useParams();
  switch (key) {
    case 'anatomy':
      return <AnatomyScene />;
    case 'tf':
      return <TfScene />;
    case 'ik':
      return <IkScene />;
    case 'planning':
      return <PlanningScene />;
    case 'dual':
      return <DualScene />;
    case 'safety':
      return <SafetyScene />;
    default:
      return <NotFound />;
  }
}

export function App() {
  useScrollManager();

  return (
    <Routes>
      <Route path="/scene/:key.html" element={<SceneRouter />} />
      <Route element={<SiteChrome />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/chapter/:id.html" element={<ChapterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
