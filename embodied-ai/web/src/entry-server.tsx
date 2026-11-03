import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './app';
import { BASENAME } from './lib/basename';

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url} basename={BASENAME}>
      <App />
    </StaticRouter>,
  );
}
